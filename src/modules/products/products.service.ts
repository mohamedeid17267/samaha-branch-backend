import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { StockMovement, StockMovementType } from '../../database/entities/stock-movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ActivityService } from '../activity/activity.service';
import { MemoryCacheService } from '../../common/services/cache.service';
import { WebsiteSyncService } from '../../common/services/website-sync.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(BranchInventory)
    private branchInventoryRepository: Repository<BranchInventory>,
    @InjectRepository(StockMovement)
    private stockMovementRepository: Repository<StockMovement>,
    private activityService: ActivityService,
    private cacheService: MemoryCacheService,
    private websiteSyncService: WebsiteSyncService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepository.findOne({
      where: { sku: createProductDto.sku },
    });
    if (existing) {
      throw new BadRequestException(
        `Product with SKU ${createProductDto.sku} already exists`,
      );
    }

    // Auto-calculate unit standardDistributerPrice if dozenPrice is provided
    if (createProductDto.dozenPrice && createProductDto.dozenPrice > 0) {
      createProductDto.standardDistributerPrice = Number(
        (createProductDto.dozenPrice / 12).toFixed(2),
      );
    }

    if (!createProductDto.category || createProductDto.category.trim() === '') {
      createProductDto.category = 'عام';
    }

    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async recordStockMovement(
    managerOrRepo: EntityManager | Repository<StockMovement>,
    data: {
      productId: number;
      branchId?: number;
      type: StockMovementType;
      quantity: number;
      balanceBefore: number;
      balanceAfter: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
      performedBy?: string;
    },
  ): Promise<StockMovement> {
    const repo =
      managerOrRepo instanceof Repository
        ? managerOrRepo
        : managerOrRepo.getRepository(StockMovement);

    const movement = repo.create(data);
    const saved = await repo.save(movement);

    // Automatic real-time website sync for any stock change
    if (data.productId && typeof data.balanceAfter === 'number') {
      const prodRepo =
        managerOrRepo instanceof Repository
          ? managerOrRepo.manager.getRepository(Product)
          : managerOrRepo.getRepository(Product);

      prodRepo
        .findOne({ where: { id: data.productId } })
        .then((p) => {
          const skuToSync = p?.sku || p?.supplierCode;
          if (skuToSync) {
            const syncService = this.websiteSyncService || new WebsiteSyncService();
            const wPrice = Number(p.websitePrice || p.standardDistributerPrice || 0);
            const wsPrice = Number(p.wholesalePrice || 0);
            syncService.syncStock(skuToSync, data.balanceAfter, {
              price: wPrice > 0 ? wPrice : undefined,
              wholesalePrice: wsPrice > 0 ? wsPrice : undefined,
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    return saved;
  }

  async createLocal(
    createProductDto: CreateProductDto,
    branchId: number,
  ): Promise<Product> {
    const existing = await this.productRepository.findOne({
      where: { sku: createProductDto.sku },
    });
    if (existing) {
      let inv = await this.branchInventoryRepository.findOne({
        where: { branchId, productId: existing.id },
      });
      if (inv) {
        throw new BadRequestException(
          `المنتج بالكود [${createProductDto.sku}] موجود بالفعل في مخزون الفرع. يمكنك زيادة رصيده من شاشة التوريد.`,
        );
      }
      const initialQty = createProductDto.globalStock || 0;
      const defaultSellingPrice =
        createProductDto.retailPrice ||
        createProductDto.standardDistributerPrice ||
        existing.retailPrice ||
        existing.standardDistributerPrice ||
        0;

      inv = this.branchInventoryRepository.create({
        branchId,
        productId: existing.id,
        currentQuantity: initialQty,
        sellingPrice: defaultSellingPrice,
        retailPrice: createProductDto.retailPrice || existing.retailPrice || defaultSellingPrice,
        wholesalePrice: createProductDto.wholesalePrice || existing.wholesalePrice || 0,
        websitePrice: createProductDto.websitePrice || existing.websitePrice || 0,
      });
      await this.branchInventoryRepository.save(inv);

      if (initialQty > 0) {
        await this.recordStockMovement(this.stockMovementRepository, {
          productId: existing.id,
          branchId,
          type: StockMovementType.INITIAL,
          quantity: initialQty,
          balanceBefore: 0,
          balanceAfter: initialQty,
          referenceType: 'INITIAL_STOCK',
          notes: 'رصيد افتتاحي بمخزن الفرع',
          performedBy: 'System',
        });
      }

      this.cacheService.invalidatePattern(`inventory:${branchId}`);
      return existing;
    }

    if (!createProductDto.category || createProductDto.category.trim() === '') {
      createProductDto.category = 'بدون تصنيف';
    }

    // Default prices
    const rPrice = createProductDto.retailPrice || createProductDto.standardDistributerPrice || 0;
    const wPrice = createProductDto.wholesalePrice || 0;
    const webPrice = createProductDto.websitePrice || 0;

    const product = this.productRepository.create({
      ...createProductDto,
      standardDistributerPrice: rPrice,
      retailPrice: rPrice,
      wholesalePrice: wPrice,
      websitePrice: webPrice,
      branchId, // Set ownership
    });

    const savedProduct = await this.productRepository.save(product);

    // Automatically add it to the branch's inventory so it can be sold
    const initialLocalStock = savedProduct.globalStock || 0;
    const inv = this.branchInventoryRepository.create({
      branchId,
      productId: savedProduct.id,
      currentQuantity: initialLocalStock,
      sellingPrice: rPrice,
      retailPrice: rPrice,
      wholesalePrice: wPrice,
      websitePrice: webPrice,
    });
    await this.branchInventoryRepository.save(inv);

    if (initialLocalStock > 0) {
      await this.recordStockMovement(this.stockMovementRepository, {
        productId: savedProduct.id,
        branchId,
        type: StockMovementType.INITIAL,
        quantity: initialLocalStock,
        balanceBefore: 0,
        balanceAfter: initialLocalStock,
        referenceType: 'INITIAL_STOCK',
        notes: 'رصيد افتتاحي عند إضافة الصنف محلياً',
        performedBy: 'System',
      });
    }

    this.cacheService.invalidatePattern(`inventory:${branchId}`);
    return savedProduct;
  }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    if (search) {
      queryBuilder.where(
        'product.name LIKE :search OR product.sku LIKE :search OR product.supplierCode LIKE :search',
        {
          search: `%${search}%`,
        },
      );
    }

    queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('product.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: number,
    updateDto: any,
    username = 'System/Admin',
  ): Promise<Product> {
    const product = await this.findOne(id);

    // Auto-calculate unit standardDistributerPrice if dozenPrice is updated
    if (
      updateDto.dozenPrice !== undefined &&
      Number(updateDto.dozenPrice) > 0
    ) {
      updateDto.standardDistributerPrice = Number(
        (Number(updateDto.dozenPrice) / 12).toFixed(2),
      );
    }

    // Track changes for audit log
    const changes: string[] = [];
    const arabicNames: Record<string, string> = {
      name: 'اسم المنتج',
      description: 'الوصف',
      dozenPrice: 'سعر الدستة',
      standardDistributerPrice: 'سعر القطعة للموزع',
      standardConsumerPrice: 'سعر القطعة للمستهلك',
      barcode: 'الباركود',
      imageUrl: 'الصورة',
      globalStock: 'المخزون الرئيسي',
    };

    for (const key of Object.keys(updateDto)) {
      if (
        updateDto[key] !== undefined &&
        updateDto[key] !== product[key as keyof Product]
      ) {
        const fieldName = arabicNames[key] || key;
        changes.push(
          `${fieldName} (من "${product[key as keyof Product] || 'فارغ'}" إلى "${updateDto[key]}")`,
        );
      }
    }

    Object.assign(product, updateDto);
    const updatedProduct = await this.productRepository.save(product);

    const changesText =
      changes.length > 0
        ? ` التغييرات: ${changes.join('، ')}.`
        : ' بدون تغييرات فعلية.';
    await this.activityService.createAuditLog(
      username,
      'تعديل منتج',
      `تم تعديل بيانات منتج: ${updatedProduct.name}.${changesText}`,
    );
    return updatedProduct;
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findOne(id);
    try {
      await this.productRepository.remove(product);
      return { message: 'تم حذف المنتج بنجاح' };
    } catch (err) {
      throw new BadRequestException(
        'لا يمكن حذف هذا الصنف لأنه مرتبط بعمليات توريد أو فواتير سابقة في النظام.',
      );
    }
  }

  async updateGlobalStock(id: number, quantity: number): Promise<Product> {
    const product = await this.findOne(id);
    product.globalStock = quantity;
    return this.productRepository.save(product);
  }

  async getBranchInventory(
    branchId: number,
    page = 1,
    limit = 100,
    search?: string,
  ): Promise<{
    data: BranchInventory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const cacheKey = `inventory:${branchId}:${page}:${limit}:${search || ''}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const qb = this.branchInventoryRepository
          .createQueryBuilder('bi')
          .leftJoinAndSelect('bi.product', 'product')
          .where('bi.branchId = :branchId', { branchId });

        if (search && search.trim()) {
          const term = `%${search.trim()}%`;
          qb.andWhere(
            '(product.name LIKE :term OR product.barcode LIKE :term OR product.itemCode LIKE :term)',
            { term },
          );
        }

        qb.orderBy('bi.currentQuantity', 'ASC');
        qb.addOrderBy('product.name', 'ASC');

        const [data, total] = await qb
          .skip((page - 1) * limit)
          .take(limit)
          .getManyAndCount();

        return {
          data,
          total,
          page,
          limit,
        };
      },
      30, // Cache for 30 seconds
    );
  }

  async recordSale(
    branchId: number,
    productId: number,
    quantity: number,
    sellingPrice: number,
    username = 'System',
  ): Promise<BranchInventory> {
    if (quantity <= 0) {
      throw new BadRequestException('الكمية يجب أن تكون أكبر من الصفر');
    }
    return this.branchInventoryRepository.manager.transaction(
      async (manager) => {
        const branchInv = await manager.findOne(BranchInventory, {
          where: { branchId, productId },
          relations: { product: true, branch: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (!branchInv) {
          throw new NotFoundException('المنتج غير متوفر بمخزون هذا الفرع');
        }

        if (branchInv.currentQuantity < quantity) {
          throw new BadRequestException(
            `الكمية المطلوبة غير متوفرة. المتاح حالياً: ${branchInv.currentQuantity} وحدة`,
          );
        }

        const prevQty = Number(branchInv.currentQuantity || 0);
        branchInv.currentQuantity = prevQty - quantity;
        const saved = await manager.save(branchInv);

        await this.recordStockMovement(manager, {
          productId: branchInv.productId,
          branchId,
          type: StockMovementType.OUT_SALE,
          quantity: -quantity,
          balanceBefore: prevQty,
          balanceAfter: saved.currentQuantity,
          referenceType: 'RETAIL_SALE',
          notes: `تسجيل مبيعات تجزئة: ${quantity} وحدة بسعر ${sellingPrice} ج.م`,
          performedBy: username,
        });

        const productName = branchInv.product?.name || `منتج #${productId}`;
        const branchName = branchInv.branch?.name || `فرع #${branchId}`;
        const totalVal = sellingPrice * quantity;

        await this.activityService.createAuditLog(
          username,
          'تسجيل مبيعات التجزئة',
          `تم بيع عدد ${quantity} وحدة من [${productName}] بفرع [${branchName}] بقيمة إجمالية ${totalVal.toFixed(2)} ج.م`,
        );

        this.cacheService.invalidatePattern(`inventory:${branchId}`);
        this.cacheService.invalidatePattern(`finance:summary:${branchId}`);
        return saved;
      },
    );
  }

  async recordWaste(
    branchId: number,
    productId: number,
    quantity: number,
    reason: string,
    username = 'System',
  ): Promise<BranchInventory> {
    if (quantity <= 0) {
      throw new BadRequestException('الكمية يجب أن تكون أكبر من الصفر');
    }
    return this.branchInventoryRepository.manager.transaction(
      async (manager) => {
        const branchInv = await manager.findOne(BranchInventory, {
          where: { branchId, productId },
          relations: { product: true, branch: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (!branchInv) {
          throw new NotFoundException('المنتج غير متوفر بمخزون هذا الفرع');
        }

        if (branchInv.currentQuantity < quantity) {
          throw new BadRequestException(
            `الكمية المراد إهلاكها أكبر من المتاح بالمخزن. المتاح: ${branchInv.currentQuantity} وحدة`,
          );
        }

        const prevQty = Number(branchInv.currentQuantity || 0);
        branchInv.currentQuantity = prevQty - quantity;
        const saved = await manager.save(branchInv);

        await this.recordStockMovement(manager, {
          productId: branchInv.productId,
          branchId,
          type: StockMovementType.WASTE,
          quantity: -quantity,
          balanceBefore: prevQty,
          balanceAfter: saved.currentQuantity,
          referenceType: 'WASTE',
          notes: `إهلاك بضائع تالفة: ${reason}`,
          performedBy: username,
        });

        const productName = branchInv.product?.name || `منتج #${productId}`;
        const branchName = branchInv.branch?.name || `فرع #${branchId}`;

        await this.activityService.createAuditLog(
          username,
          'إهلاك بضائع تالفة',
          `تم إهلاك وتلف عدد ${quantity} وحدة من [${productName}] بفرع [${branchName}]. السبب: ${reason}`,
        );

        await this.activityService.createNotification({
          branchId,
          message: `تم تسجيل إهلاك بضائع تالفة بالفرع [${branchName}]: ${quantity} وحدة من ${productName} بسبب: ${reason}`,
          type: 'WARNING',
        });

        this.cacheService.invalidatePattern(`inventory:${branchId}`);
        return saved;
      },
    );
  }

  async updateSellingPrice(
    branchId: number,
    productId: number,
    sellingPrice?: number,
    username = 'System',
    extraPrices?: { retailPrice?: number; wholesalePrice?: number; websitePrice?: number; costPrice?: number },
  ): Promise<BranchInventory> {
    const branchInv = await this.branchInventoryRepository.findOne({
      where: { branchId, productId },
      relations: { product: true },
    });

    if (!branchInv) {
      throw new NotFoundException('المنتج غير متوفر بمخزون هذا الفرع');
    }

    if (sellingPrice !== undefined && sellingPrice !== null) {
      branchInv.sellingPrice = Number(sellingPrice);
    }
    if (extraPrices?.retailPrice !== undefined && extraPrices.retailPrice !== null) {
      branchInv.retailPrice = Number(extraPrices.retailPrice);
      if (!branchInv.sellingPrice) branchInv.sellingPrice = branchInv.retailPrice;
    }
    if (extraPrices?.wholesalePrice !== undefined && extraPrices.wholesalePrice !== null) {
      branchInv.wholesalePrice = Number(extraPrices.wholesalePrice);
    }
    if (extraPrices?.websitePrice !== undefined && extraPrices.websitePrice !== null) {
      branchInv.websitePrice = Number(extraPrices.websitePrice);
    }

    if (branchInv.product) {
      if (extraPrices?.retailPrice !== undefined) branchInv.product.retailPrice = Number(extraPrices.retailPrice);
      if (extraPrices?.wholesalePrice !== undefined) branchInv.product.wholesalePrice = Number(extraPrices.wholesalePrice);
      if (extraPrices?.websitePrice !== undefined) branchInv.product.websitePrice = Number(extraPrices.websitePrice);
      if (extraPrices?.costPrice !== undefined && extraPrices.costPrice !== null) {
        branchInv.product.costPrice = Number(extraPrices.costPrice);
      }
      await this.productRepository.save(branchInv.product);
    }

    const saved = await this.branchInventoryRepository.save(branchInv);

    await this.activityService.createAuditLog(
      username,
      'تحديث أسعار وبيانات الصنف',
      `تم تحديث أسعار الصنف [${branchInv.product?.name || productId}] (تكلفة: ${branchInv.product?.costPrice}، قطاعي: ${branchInv.retailPrice}، جملة: ${branchInv.wholesalePrice}، ويبسايت: ${branchInv.websitePrice})`,
    );

    this.cacheService.invalidatePattern(`inventory:${branchId}`);
    return saved;
  }

  async importCsv(
    csvText: string,
    username = 'System',
  ): Promise<{ successCount: number; errors: string[] }> {
    const lines = csvText.split(/\r?\n/);
    const errors: string[] = [];
    let successCount = 0;

    if (lines.length <= 1) {
      throw new BadRequestException('الملف فارغ أو غير صالح');
    }

    const header = lines[0]
      .split(',')
      .map((h) => h.trim().replace(/^["']|["']$/g, ''));

    const skuIdx = header.findIndex(
      (h) => h.toLowerCase() === 'sku' || h === 'الكود' || h === 'رمز المنتج',
    );
    const nameIdx = header.findIndex(
      (h) => h.toLowerCase() === 'name' || h === 'الاسم' || h === 'اسم المنتج',
    );
    const costPriceIdx = header.findIndex(
      (h) =>
        h.toLowerCase() === 'costprice' ||
        h === 'cost_price' ||
        h === 'سعر التكلفة' ||
        h === 'التكلفة',
    );
    const standardDistributerPriceIdx = header.findIndex(
      (h) =>
        h.toLowerCase() === 'standarddistributerprice' ||
        h === 'standard_distributer_price' ||
        h === 'سعر الجملة' ||
        h === 'سعر التوريد',
    );
    const globalStockIdx = header.findIndex(
      (h) =>
        h.toLowerCase() === 'globalstock' ||
        h === 'global_stock' ||
        h === 'الكمية' ||
        h === 'الكمية الإجمالية' ||
        h === 'المخزون',
    );
    const categoryIdx = header.findIndex(
      (h) => h.toLowerCase() === 'category' || h === 'الفئة' || h === 'القسم',
    );
    const dozenPriceIdx = header.findIndex(
      (h) =>
        h.toLowerCase() === 'dozenprice' ||
        h === 'سعر الدستة' ||
        h === 'الدستة',
    );

    if (skuIdx === -1 || nameIdx === -1) {
      throw new BadRequestException(
        'رؤوس الأعمدة غير صالحة. يجب أن يحتوي الملف على أعمدة: الكود (SKU)، الاسم (Name)',
      );
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (columns.length < 2) {
        errors.push(`السطر ${i + 1}: بيانات غير مكتملة`);
        continue;
      }

      const sku = columns[skuIdx];
      const name = columns[nameIdx];
      const costPrice =
        costPriceIdx !== -1 ? Number(columns[costPriceIdx]) || 0 : 0;
      const globalStock =
        globalStockIdx !== -1 ? Number(columns[globalStockIdx]) || 0 : 0;
      const category =
        categoryIdx !== -1 ? columns[categoryIdx] || 'عام' : 'عام';

      let dozenPrice =
        dozenPriceIdx !== -1 ? Number(columns[dozenPriceIdx]) || 0 : 0;
      let standardDistributerPrice =
        standardDistributerPriceIdx !== -1
          ? Number(columns[standardDistributerPriceIdx]) || 0
          : 0;

      if (dozenPrice > 0 && standardDistributerPrice === 0) {
        standardDistributerPrice = Number((dozenPrice / 12).toFixed(2));
      } else if (dozenPrice === 0 && standardDistributerPrice > 0) {
        dozenPrice = Number((standardDistributerPrice * 12).toFixed(2));
      }

      if (!sku || !name) {
        errors.push(`السطر ${i + 1}: الكود أو الاسم غير صالح`);
        continue;
      }

      try {
        let product = await this.productRepository.findOne({ where: { sku } });
        if (product) {
          product.name = name;
          product.costPrice = costPrice;
          product.standardDistributerPrice = standardDistributerPrice;
          product.dozenPrice = dozenPrice;
          product.category = category;
          product.globalStock =
            Number(product.globalStock) + Number(globalStock);
          await this.productRepository.save(product);
        } else {
          product = this.productRepository.create({
            sku,
            name,
            costPrice,
            standardDistributerPrice,
            category,
            dozenPrice,
            globalStock,
          });
          await this.productRepository.save(product);
        }
        successCount++;
      } catch (err) {
        errors.push(`السطر ${i + 1} (${sku}): ${err.message}`);
      }
    }

    if (successCount > 0) {
      await this.activityService.createAuditLog(
        username,
        'استيراد منتجات مجمع',
        `تم استيراد/تحديث عدد ${successCount} منتج بنجاح عبر ملف CSV. أخطاء التوليد: ${errors.length}`,
      );
    }

    return { successCount, errors };
  }

  async stockIn(
    branchId: number,
    skuOrBarcode: string,
    quantity: number = 1,
    username: string = 'System',
    sessionId?: string,
  ): Promise<{
    success: boolean;
    product: Product;
    addedQuantity: number;
    currentQuantity: number;
    sellingPrice: number;
    message: string;
  }> {
    if (!skuOrBarcode || skuOrBarcode.trim() === '') {
      throw new BadRequestException('كود الباركود مطلوب');
    }
    const cleanCode = skuOrBarcode.trim();
    const qty = Number(quantity) || 1;
    if (qty <= 0) {
      throw new BadRequestException('الكمية يجب أن تكون أكبر من صفر');
    }

    // 1. Find product by Barcode (SKU), Supplier Code, or ID
    let product = await this.productRepository.findOne({
      where: [{ sku: cleanCode }, { supplierCode: cleanCode }],
    });

    if (!product && !isNaN(Number(cleanCode))) {
      product = await this.productRepository.findOne({
        where: { id: Number(cleanCode) },
      });
    }

    if (!product) {
      throw new NotFoundException(`المنتج ذو الكود [${cleanCode}] غير مسجل بالنظام`);
    }

    // 2. Atomic Database Transaction with Pessimistic Locking
    // Prevents rapid consecutive scans from overwriting each other's balances
    const { prevQty, currentQuantity, sellingPrice } =
      await this.branchInventoryRepository.manager.transaction(
        async (manager) => {
          let branchInv = await manager.findOne(BranchInventory, {
            where: { branchId, productId: product.id },
            lock: { mode: 'pessimistic_write' },
          });

          const pQty = branchInv ? Number(branchInv.currentQuantity || 0) : 0;
          let sPrice = branchInv ? Number(branchInv.sellingPrice || 0) : 0;

          if (!branchInv) {
            sPrice = Number(product.standardDistributerPrice) || 0;
            branchInv = manager.create(BranchInventory, {
              branchId,
              productId: product.id,
              currentQuantity: qty,
              sellingPrice: sPrice,
            });
            await manager.save(branchInv);
            return { prevQty: 0, currentQuantity: qty, sellingPrice: sPrice };
          } else {
            const newQty = pQty + qty;
            branchInv.currentQuantity = newQty;
            await manager.save(branchInv);
            return {
              prevQty: pQty,
              currentQuantity: newQty,
              sellingPrice: sPrice,
            };
          }
        },
      );

    // Record stock movement and activity log asynchronously so barcode scan responds in milliseconds
    this.recordStockMovement(this.stockMovementRepository, {
      productId: product.id,
      branchId,
      type: StockMovementType.IN_SUPPLY,
      quantity: qty,
      balanceBefore: prevQty,
      balanceAfter: currentQuantity,
      referenceType: 'STOCK_IN_SCAN',
      referenceId: sessionId || product.sku,
      notes: sessionId
        ? `توريد مخزون بالإسكانر (جلسة: ${sessionId})`
        : `توريد مخزون بالإسكانر (باركود: ${product.sku})`,
      performedBy: username,
    }).catch((err) => console.error('[StockIn] recordStockMovement error:', err));

    this.activityService
      .createAuditLog(
        username,
        'توريد مخزون بالباركود',
        `تم توريد كمية ${qty} وحدة من [${product.name}] (كود: ${product.sku}) لمخزن فرع #${branchId}. الرصيد الجديد: ${currentQuantity}`,
      )
      .catch((err) => console.error('[StockIn] createAuditLog error:', err));

    const skuToSync = product?.sku || product?.supplierCode || cleanCode;
    if (skuToSync) {
      const syncService = this.websiteSyncService || new WebsiteSyncService();
      const wPrice = Number(product.websitePrice || product.standardDistributerPrice || 0);
      const wsPrice = Number(product.wholesalePrice || 0);
      syncService.syncStock(skuToSync, currentQuantity, {
        price: wPrice > 0 ? wPrice : undefined,
        wholesalePrice: wsPrice > 0 ? wsPrice : undefined,
      }).catch((err) => {
        console.error('[WebsiteSync] Error syncing on supply:', err);
      });
    }

    return {
      success: true,
      product,
      addedQuantity: qty,
      currentQuantity: currentQuantity,
      sellingPrice: sellingPrice,
      message: `تم توريد +${qty} بنجاح إلى مخزون [${product.name}]`,
    };
  }

  async findByBarcodeOrSku(branchId: number, code: string): Promise<any> {
    if (!code || code.trim() === '') {
      throw new BadRequestException('كود الصنف مطلوب');
    }
    const cleanCode = code.trim();
    let product = await this.productRepository.findOne({
      where: [{ sku: cleanCode }, { supplierCode: cleanCode }],
    });
    if (!product && !isNaN(Number(cleanCode))) {
      product = await this.productRepository.findOne({
        where: { id: Number(cleanCode) },
      });
    }
    if (!product) {
      throw new NotFoundException(`لم يتم العثور على صنف بالباركود [${cleanCode}]`);
    }

    const branchInv = await this.branchInventoryRepository.findOne({
      where: { branchId, productId: product.id },
    });

    return {
      product,
      currentQuantity: branchInv ? branchInv.currentQuantity : 0,
      sellingPrice: branchInv ? branchInv.sellingPrice : product.standardDistributerPrice,
    };
  }

  async adjustStock(
    branchId: number,
    productId: number,
    newQuantity: number,
    reason: string,
    username = 'System',
  ): Promise<{ success: boolean; newQuantity: number; movement: StockMovement }> {
    if (newQuantity < 0) {
      throw new BadRequestException('لا يمكن أن تكون الكمية سالبة');
    }

    const result = await this.branchInventoryRepository.manager.transaction(async (manager) => {
      let branchInv = await manager.findOne(BranchInventory, {
        where: { branchId, productId },
        relations: { product: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!branchInv) {
        branchInv = manager.create(BranchInventory, {
          branchId,
          productId,
          currentQuantity: newQuantity,
        });
      }

      const prevQty = Number(branchInv.currentQuantity || 0);
      const diff = newQuantity - prevQty;
      branchInv.currentQuantity = newQuantity;
      await manager.save(branchInv);

      const movement = await this.recordStockMovement(manager, {
        productId,
        branchId,
        type: StockMovementType.ADJUSTMENT,
        quantity: diff,
        balanceBefore: prevQty,
        balanceAfter: newQuantity,
        referenceType: 'MANUAL_ADJUSTMENT',
        notes: reason || 'تسوية جردية وتعديل رصيد الصنف',
        performedBy: username,
      });

      await this.activityService.createAuditLog(
        username,
        'تسوية جردية للصنف',
        `تم تسوية رصيد الصنف #${productId} من ${prevQty} إلى ${newQuantity} (الفرق: ${diff > 0 ? '+' : ''}${diff}). السبب: ${reason || 'تسوية جردية'}`,
      );

      return {
        success: true,
        newQuantity,
        movement,
      };
    });

    // Background sync to Linea website
    this.productRepository
      .findOne({ where: { id: productId } })
      .then((p) => {
        if (p?.sku) {
          this.websiteSyncService.syncStock(p.sku, newQuantity).catch(() => {});
        }
      })
      .catch(() => {});

    return result;
  }

  async getProductStockMovements(
    productId: number,
    branchId?: number,
    limit = 100,
  ): Promise<{
    product: Product;
    branchInventory?: BranchInventory;
    currentQuantity: number;
    summary: {
      totalIn: number;
      totalOut: number;
      currentQuantity: number;
    };
    movements: StockMovement[];
  }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`المنتج #${productId} غير موجود`);
    }

    let branchInv: BranchInventory | null = null;
    if (branchId) {
      branchInv = await this.branchInventoryRepository.findOne({
        where: { productId, branchId },
      });
    }

    const currentQuantity = branchInv
      ? Number(branchInv.currentQuantity || 0)
      : Number(product.globalStock || 0);

    const qb = this.stockMovementRepository
      .createQueryBuilder('m')
      .where('m.productId = :productId', { productId });

    if (branchId) {
      qb.andWhere('(m.branchId = :branchId OR m.branchId IS NULL)', { branchId });
    }

    qb.orderBy('m.createdAt', 'DESC')
      .take(limit);

    let movements = await qb.getMany();

    // If no movements exist yet in database, but the product already has stock:
    // Create an opening balance entry so the user sees a complete history!
    if (movements.length === 0 && currentQuantity > 0) {
      const initialMovement = this.stockMovementRepository.create({
        productId,
        branchId,
        type: StockMovementType.INITIAL,
        quantity: currentQuantity,
        balanceBefore: 0,
        balanceAfter: currentQuantity,
        referenceType: 'INITIAL_STOCK',
        notes: 'رصيد افتتاحي مسجل بالنظام',
        performedBy: 'System',
        createdAt: product.createdAt || new Date(),
      });
      await this.stockMovementRepository.save(initialMovement);
      movements = [initialMovement];
    }

    let totalIn = 0;
    let totalOut = 0;
    for (const m of movements) {
      if (m.quantity > 0) {
        totalIn += Number(m.quantity);
      } else {
        totalOut += Math.abs(Number(m.quantity));
      }
    }

    return {
      product,
      branchInventory: branchInv || undefined,
      currentQuantity,
      summary: {
        totalIn,
        totalOut,
        currentQuantity,
      },
      movements,
    };
  }

  async syncLookup(code: string, branchId: number = 1) {
    if (!code || code.trim() === '') {
      throw new BadRequestException('كود الصنف مطلوب');
    }
    const cleanCode = code.trim();
    let product = await this.productRepository.findOne({
      where: [{ sku: cleanCode }, { supplierCode: cleanCode }],
    });
    if (!product && !isNaN(Number(cleanCode))) {
      product = await this.productRepository.findOne({
        where: { id: Number(cleanCode) },
      });
    }
    if (!product) {
      return { found: false, message: `لم يتم العثور على صنف بالكود [${cleanCode}]` };
    }

    const branchInv = await this.branchInventoryRepository.findOne({
      where: { branchId, productId: product.id },
    });

    const stock = branchInv ? Number(branchInv.currentQuantity || 0) : 0;
    const websitePrice = Number(branchInv?.websitePrice || product.websitePrice || product.standardDistributerPrice || 0);
    const wholesalePrice = Number(branchInv?.wholesalePrice || product.wholesalePrice || 0);
    const retailPrice = Number(branchInv?.sellingPrice || product.standardDistributerPrice || 0);

    return {
      found: true,
      productId: product.id,
      name: product.name,
      sku: product.sku || cleanCode,
      supplierCode: product.supplierCode,
      stock,
      websitePrice,
      wholesalePrice,
      retailPrice,
    };
  }

  async syncCatalog(branchId: number = 1) {
    const products = await this.productRepository.find();
    const inventories = await this.branchInventoryRepository.find({
      where: { branchId },
    });
    const invMap = new Map<number, BranchInventory>();
    inventories.forEach(inv => invMap.set(inv.productId, inv));

    return products.map(p => {
      const inv = invMap.get(p.id);
      const stock = inv ? Number(inv.currentQuantity || 0) : 0;
      const websitePrice = Number(inv?.websitePrice || p.websitePrice || p.standardDistributerPrice || 0);
      const wholesalePrice = Number(inv?.wholesalePrice || p.wholesalePrice || 0);
      const retailPrice = Number(inv?.sellingPrice || p.standardDistributerPrice || 0);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        supplierCode: p.supplierCode,
        stock,
        websitePrice,
        wholesalePrice,
        retailPrice,
      };
    });
  }
}
