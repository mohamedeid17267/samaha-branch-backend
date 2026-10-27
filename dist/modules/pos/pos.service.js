"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PosService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const branch_sale_entity_1 = require("../../database/entities/branch-sale.entity");
const branch_sale_item_entity_1 = require("../../database/entities/branch-sale-item.entity");
const branch_inventory_entity_1 = require("../../database/entities/branch-inventory.entity");
const product_entity_1 = require("../../database/entities/product.entity");
const stock_movement_entity_1 = require("../../database/entities/stock-movement.entity");
const customer_entity_1 = require("../../database/entities/customer.entity");
const customer_debt_ledger_entity_1 = require("../../database/entities/customer-debt-ledger.entity");
const transaction_type_enum_1 = require("../../common/enums/transaction-type.enum");
const activity_service_1 = require("../activity/activity.service");
const cache_service_1 = require("../../common/services/cache.service");
const website_sync_service_1 = require("../../common/services/website-sync.service");
let PosService = PosService_1 = class PosService {
    saleRepository;
    dataSource;
    activityService;
    cacheService;
    websiteSyncService;
    logger = new common_1.Logger(PosService_1.name);
    constructor(saleRepository, dataSource, activityService, cacheService, websiteSyncService) {
        this.saleRepository = saleRepository;
        this.dataSource = dataSource;
        this.activityService = activityService;
        this.cacheService = cacheService;
        this.websiteSyncService = websiteSyncService;
    }
    async createSale(createSaleDto, username = 'System') {
        const { branchId, items, discount = 0, paymentMethod = 'CASH', saleType = 'RETAIL', customerName, customerId, paidAmount, remainingAmount, } = createSaleDto;
        const effectiveIdempotencyKey = createSaleDto.idempotencyKey || createSaleDto.uuid;
        if (effectiveIdempotencyKey) {
            const existingSale = await this.saleRepository.findOne({
                where: { idempotencyKey: effectiveIdempotencyKey },
                relations: { items: { product: true }, branch: true, customer: true },
            });
            if (existingSale) {
                this.logger.log(`[Idempotency Hit] Sale already processed for key: ${effectiveIdempotencyKey} (Sale ID: ${existingSale.id})`);
                return existingSale;
            }
        }
        if (!items || items.length === 0) {
            throw new common_1.BadRequestException('Sale must contain at least one item');
        }
        const pendingMovements = [];
        const completedSale = await this.dataSource.transaction(async (manager) => {
            const productIds = Array.from(new Set(items.map((i) => Number(i.productId))));
            const inventories = await manager.find(branch_inventory_entity_1.BranchInventory, {
                where: { branchId, productId: (0, typeorm_2.In)(productIds) },
                relations: { product: true },
            });
            const invMap = new Map();
            for (const inv of inventories) {
                invMap.set(Number(inv.productId), inv);
            }
            let totalAmount = 0;
            const saleItems = [];
            const inventoryUpdates = [];
            for (const itemDto of items) {
                const inventory = invMap.get(Number(itemDto.productId));
                if (!inventory) {
                    throw new common_1.NotFoundException(`Product ID ${itemDto.productId} not found in branch inventory`);
                }
                if (inventory.currentQuantity < itemDto.quantity) {
                    if (effectiveIdempotencyKey) {
                        this.logger.warn(`[Offline Reconciliation] Stock negative for Product ${itemDto.productId} (Available: ${inventory.currentQuantity}, Sold: ${itemDto.quantity})`);
                    }
                    else {
                        throw new common_1.BadRequestException(`Insufficient stock for Product ID ${itemDto.productId}`);
                    }
                }
                const prevQty = Number(inventory.currentQuantity || 0);
                const newQty = prevQty - itemDto.quantity;
                inventory.currentQuantity = newQty;
                inventoryUpdates.push({ id: inventory.id, newQty });
                pendingMovements.push({
                    productId: itemDto.productId,
                    quantity: itemDto.quantity,
                    balanceBefore: prevQty,
                    balanceAfter: newQty,
                });
                let unitPrice = 0;
                const effectiveSaleType = (saleType || 'RETAIL').toUpperCase();
                if (effectiveSaleType === 'WHOLESALE') {
                    unitPrice =
                        Number(inventory.wholesalePrice) ||
                            Number(inventory.product?.wholesalePrice) ||
                            Number(inventory.sellingPrice) ||
                            0;
                }
                else if (effectiveSaleType === 'WEBSITE') {
                    unitPrice =
                        Number(inventory.websitePrice) ||
                            Number(inventory.product?.websitePrice) ||
                            Number(inventory.sellingPrice) ||
                            0;
                }
                else {
                    unitPrice =
                        Number(inventory.retailPrice) ||
                            Number(inventory.product?.retailPrice) ||
                            Number(inventory.sellingPrice) ||
                            0;
                }
                if (itemDto.unitPrice !== undefined && itemDto.unitPrice !== null && Number(itemDto.unitPrice) >= 0) {
                    unitPrice = Number(itemDto.unitPrice);
                }
                const subTotal = unitPrice * itemDto.quantity;
                totalAmount += subTotal;
                const saleItem = manager.create(branch_sale_item_entity_1.BranchSaleItem, {
                    productId: itemDto.productId,
                    quantity: itemDto.quantity,
                    unitPrice,
                    subTotal,
                });
                saleItem.product = inventory.product;
                saleItems.push(saleItem);
            }
            if (inventoryUpdates.length > 0) {
                const ids = inventoryUpdates.map((u) => u.id).join(',');
                const cases = inventoryUpdates
                    .map((u) => `WHEN ${u.id} THEN ${u.newQty}`)
                    .join(' ');
                await manager.query(`UPDATE branch_inventories SET currentQuantity = CASE id ${cases} END WHERE id IN (${ids})`);
            }
            const netAmount = Math.max(0, totalAmount - Number(discount || 0));
            let salePaid = netAmount;
            let saleRemaining = 0;
            if (paymentMethod === 'CREDIT' || paymentMethod === 'آجل') {
                salePaid = 0;
                saleRemaining = netAmount;
            }
            else if (remainingAmount !== undefined && Number(remainingAmount) > 0) {
                saleRemaining = Number(remainingAmount);
                salePaid = paidAmount !== undefined ? Number(paidAmount) : Math.max(0, netAmount - saleRemaining);
            }
            else if (paidAmount !== undefined && Number(paidAmount) < netAmount) {
                salePaid = Math.max(0, Number(paidAmount));
                saleRemaining = Math.max(0, netAmount - salePaid);
            }
            let finalCustomerName = customerName;
            let customer = null;
            if (customerId) {
                customer = await manager.findOne(customer_entity_1.Customer, {
                    where: { id: customerId },
                });
                if (customer && !finalCustomerName) {
                    finalCustomerName = customer.name;
                }
            }
            const explicitCreatedAt = createSaleDto.createdAt
                ? new Date(createSaleDto.createdAt)
                : null;
            const validCreatedAt = explicitCreatedAt && !isNaN(explicitCreatedAt.getTime())
                ? explicitCreatedAt
                : null;
            const sale = manager.create(branch_sale_entity_1.BranchSale, {
                branchId,
                totalAmount,
                discount,
                netAmount,
                paymentMethod,
                saleType: saleType || 'RETAIL',
                customerName: finalCustomerName,
                customerId: customer?.id || customerId || undefined,
                paidAmount: salePaid,
                remainingAmount: saleRemaining,
                idempotencyKey: effectiveIdempotencyKey || undefined,
                offlineReferenceId: createSaleDto.uuid || undefined,
                invoiceNumber: createSaleDto.invoiceNumber || undefined,
                deviceId: createSaleDto.deviceId || undefined,
                syncedAt: effectiveIdempotencyKey ? new Date() : undefined,
                createdAt: validCreatedAt || undefined,
            });
            const savedSale = await manager.save(sale);
            for (const item of saleItems) {
                item.saleId = savedSale.id;
            }
            await manager.save(branch_sale_item_entity_1.BranchSaleItem, saleItems);
            if (validCreatedAt) {
                await manager.update(branch_sale_entity_1.BranchSale, { id: savedSale.id }, { createdAt: validCreatedAt });
                savedSale.createdAt = validCreatedAt;
            }
            if (customer) {
                const prevDebt = Number(customer.currentDebt) || 0;
                const afterInvoiceDebt = prevDebt + netAmount;
                const finalDebt = afterInvoiceDebt - salePaid;
                const effectiveInvoiceDate = validCreatedAt
                    ? validCreatedAt.toISOString().split('T')[0]
                    : (createSaleDto.createdAt
                        ? new Date(createSaleDto.createdAt).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0]);
                const chargeEntry = manager.create(customer_debt_ledger_entity_1.CustomerDebtLedger, {
                    customerId: customer.id,
                    branchId,
                    transactionType: transaction_type_enum_1.TransactionType.CHARGE,
                    invoiceNumber: createSaleDto.invoiceNumber || String(savedSale.id),
                    relatedSaleId: savedSale.id,
                    amount: netAmount,
                    paidAmount: salePaid,
                    balanceAfter: afterInvoiceDebt,
                    description: `فاتورة مبيعات POS #${createSaleDto.invoiceNumber || savedSale.id}`,
                    invoiceDate: effectiveInvoiceDate,
                    paymentMethod,
                    recordedBy: username,
                    createdAt: validCreatedAt || undefined,
                });
                const savedCharge = await manager.save(chargeEntry);
                if (validCreatedAt) {
                    await manager.update(customer_debt_ledger_entity_1.CustomerDebtLedger, { id: savedCharge.id }, { createdAt: validCreatedAt });
                }
                if (salePaid > 0) {
                    const paymentEntry = manager.create(customer_debt_ledger_entity_1.CustomerDebtLedger, {
                        customerId: customer.id,
                        branchId,
                        transactionType: transaction_type_enum_1.TransactionType.PAYMENT,
                        invoiceNumber: createSaleDto.invoiceNumber || String(savedSale.id),
                        relatedSaleId: savedSale.id,
                        amount: salePaid,
                        paidAmount: salePaid,
                        balanceAfter: finalDebt,
                        description: `سداد مع فاتورة POS #${createSaleDto.invoiceNumber || savedSale.id}`,
                        invoiceDate: effectiveInvoiceDate,
                        paymentMethod: paymentMethod === 'CREDIT' ? 'نقدي' : paymentMethod,
                        recordedBy: username,
                        createdAt: validCreatedAt || undefined,
                    });
                    const savedPayment = await manager.save(paymentEntry);
                    if (validCreatedAt) {
                        await manager.update(customer_debt_ledger_entity_1.CustomerDebtLedger, { id: savedPayment.id }, { createdAt: validCreatedAt });
                    }
                }
                customer.totalInvoiced = Number(customer.totalInvoiced || 0) + netAmount;
                customer.totalPaid = Number(customer.totalPaid || 0) + salePaid;
                customer.currentDebt = Number(customer.totalInvoiced) - Number(customer.totalPaid);
                await manager.save(customer);
            }
            const movements = pendingMovements.map((pm) => manager.create(stock_movement_entity_1.StockMovement, {
                productId: pm.productId,
                branchId,
                type: stock_movement_entity_1.StockMovementType.OUT_SALE,
                quantity: -pm.quantity,
                balanceBefore: pm.balanceBefore,
                balanceAfter: pm.balanceAfter,
                referenceType: 'POS_SALE',
                referenceId: String(savedSale.id),
                notes: `فاتورة بيع كاشير POS رقم #${savedSale.id}`,
                performedBy: username,
                createdAt: validCreatedAt || undefined,
            }));
            if (movements.length > 0) {
                await manager.save(stock_movement_entity_1.StockMovement, movements);
            }
            savedSale.items = saleItems;
            savedSale.customer = customer || undefined;
            return savedSale;
        });
        this.cacheService.invalidatePattern(`inventory:${branchId}`);
        this.activityService.createAuditLog(username, 'عملية بيع POS', `تسجيل مبيعات للفرع بقيمة ${completedSale.netAmount} ج.م (رقم الفاتورة #${completedSale.id})${completedSale.customerName ? ` لصالح العميل: ${completedSale.customerName}` : ''}`).catch((err) => this.logger.warn(`Audit log error: ${err.message}`));
        if (completedSale && Array.isArray(completedSale.items)) {
            const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
            const lineaUrl = process.env.LINEA_WEBSITE_URL;
            const skipWebsiteSync = isVercel && (!lineaUrl || lineaUrl.includes('localhost') || lineaUrl.includes('127.0.0.1'));
            if (!skipWebsiteSync) {
                const syncService = this.websiteSyncService || new website_sync_service_1.WebsiteSyncService();
                const processedProductIds = new Set();
                for (const item of completedSale.items) {
                    if (!item.productId || processedProductIds.has(item.productId))
                        continue;
                    processedProductIds.add(item.productId);
                    const pm = [...pendingMovements].reverse().find((m) => m.productId === item.productId);
                    const newStock = pm ? pm.balanceAfter : 0;
                    const sku = item.product?.sku;
                    const websitePrice = Number(item.product?.websitePrice || item.product?.retailPrice || 0);
                    const wholesalePrice = Number(item.product?.wholesalePrice || 0);
                    if (sku) {
                        syncService.syncStock(sku, newStock, { price: websitePrice, wholesalePrice }).catch(() => { });
                    }
                    else {
                        this.dataSource
                            .getRepository(product_entity_1.Product)
                            .findOne({ where: { id: item.productId } })
                            .then((p) => {
                            if (p?.sku) {
                                syncService.syncStock(p.sku, newStock, {
                                    price: Number(p.websitePrice || p.retailPrice || 0),
                                    wholesalePrice: Number(p.wholesalePrice || 0),
                                }).catch(() => { });
                            }
                        })
                            .catch(() => { });
                    }
                }
            }
        }
        return completedSale;
    }
    async getSales(branchId, page = 1, limit = 200, startDate, endDate) {
        const qb = this.saleRepository
            .createQueryBuilder('sale')
            .leftJoinAndSelect('sale.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .leftJoinAndSelect('sale.branch', 'branch')
            .leftJoinAndSelect('sale.customer', 'customer');
        if (branchId && Number(branchId) > 0) {
            qb.where('sale.branchId = :branchId', { branchId: Number(branchId) });
        }
        if (startDate) {
            qb.andWhere('sale.createdAt >= :startDate', {
                startDate: new Date(startDate),
            });
        }
        if (endDate) {
            qb.andWhere('sale.createdAt <= :endDate', {
                endDate: new Date(endDate),
            });
        }
        qb.orderBy('sale.createdAt', 'DESC');
        const allMatching = await qb.getMany();
        const total = allMatching.length;
        let totalSales = 0;
        let totalItemsCount = 0;
        let cashTotal = 0;
        let visaTotal = 0;
        let instapayTotal = 0;
        let walletTotal = 0;
        let creditTotal = 0;
        for (const s of allMatching) {
            const net = Number(s.netAmount) || 0;
            totalSales += net;
            const paid = Number(s.paidAmount !== undefined && s.paidAmount !== null
                ? s.paidAmount
                : s.paymentMethod === 'CREDIT' || s.paymentMethod === 'آجل'
                    ? 0
                    : net);
            const remaining = Number(s.remainingAmount !== undefined && s.remainingAmount !== null
                ? s.remainingAmount
                : s.paymentMethod === 'CREDIT' || s.paymentMethod === 'آجل'
                    ? net
                    : Math.max(0, net - paid));
            creditTotal += remaining;
            if (paid > 0) {
                const m = (s.paymentMethod || 'CASH').toUpperCase();
                if (m === 'CASH' || m === 'كاش') {
                    cashTotal += paid;
                }
                else if (m === 'CARD' || m === 'VISA') {
                    visaTotal += paid;
                }
                else if (m === 'INSTAPAY') {
                    instapayTotal += paid;
                }
                else if (m === 'WALLET') {
                    walletTotal += paid;
                }
                else if (m !== 'CREDIT' && m !== 'آجل') {
                    cashTotal += paid;
                }
            }
            if (s.items && Array.isArray(s.items)) {
                for (const item of s.items) {
                    totalItemsCount += Number(item.quantity) || 0;
                }
            }
        }
        const data = limit && limit > 0
            ? allMatching.slice((page - 1) * limit, page * limit)
            : allMatching;
        return {
            data,
            total,
            page,
            limit,
            summary: {
                totalSales,
                invoicesCount: total,
                totalItemsCount,
                cashTotal,
                visaTotal,
                instapayTotal,
                walletTotal,
                creditTotal,
            },
        };
    }
    async getTreasuryReport(branchId, startDate, endDate) {
        const qb = this.saleRepository
            .createQueryBuilder('sale')
            .leftJoinAndSelect('sale.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .leftJoinAndSelect('sale.customer', 'customer')
            .where('sale.branchId = :branchId', { branchId });
        if (startDate) {
            qb.andWhere('sale.createdAt >= :startDate', { startDate: new Date(startDate) });
        }
        if (endDate) {
            qb.andWhere('sale.createdAt <= :endDate', { endDate: new Date(endDate) });
        }
        qb.orderBy('sale.createdAt', 'DESC');
        const sales = await qb.getMany();
        const debtQb = this.dataSource
            .getRepository(customer_debt_ledger_entity_1.CustomerDebtLedger)
            .createQueryBuilder('ledger')
            .leftJoinAndSelect('ledger.customer', 'customer')
            .where('ledger.branchId = :branchId', { branchId })
            .andWhere('ledger.transactionType = :txType', { txType: transaction_type_enum_1.TransactionType.PAYMENT });
        if (startDate) {
            debtQb.andWhere('ledger.createdAt >= :startDate', { startDate: new Date(startDate) });
        }
        if (endDate) {
            debtQb.andWhere('ledger.createdAt <= :endDate', { endDate: new Date(endDate) });
        }
        debtQb.orderBy('ledger.createdAt', 'DESC');
        const debtPayments = await debtQb.getMany();
        let cash = 0;
        let instapay = 0;
        let wallet = 0;
        let card = 0;
        let credit = 0;
        let totalSales = 0;
        let cashCount = 0;
        let instapayCount = 0;
        let walletCount = 0;
        let cardCount = 0;
        let creditCount = 0;
        for (const s of sales) {
            const net = Number(s.netAmount) || 0;
            totalSales += net;
            const paid = Number(s.paidAmount !== undefined && s.paidAmount !== null
                ? s.paidAmount
                : s.paymentMethod === 'CREDIT'
                    ? 0
                    : net);
            const remaining = Number(s.remainingAmount !== undefined && s.remainingAmount !== null
                ? s.remainingAmount
                : s.paymentMethod === 'CREDIT'
                    ? net
                    : 0);
            const m = (s.paymentMethod || 'CASH').toUpperCase();
            if (m === 'CASH' || m === 'كاش') {
                cash += paid;
                cashCount++;
            }
            else if (m === 'INSTAPAY') {
                instapay += paid;
                instapayCount++;
            }
            else if (m === 'WALLET') {
                wallet += paid;
                walletCount++;
            }
            else if (m === 'CARD' || m === 'VISA') {
                card += paid;
                cardCount++;
            }
            else if (m === 'CREDIT' || m === 'آجل') {
                creditCount++;
            }
            else {
                cash += paid;
                cashCount++;
            }
            if (remaining > 0) {
                credit += remaining;
            }
        }
        const externalDebtPayments = debtPayments.filter((p) => !p.relatedSaleId);
        for (const p of externalDebtPayments) {
            const amt = Number(p.amount) || Number(p.paidAmount) || 0;
            const method = (p.paymentMethod || 'CASH').toUpperCase();
            if (method.includes('INSTAPAY') || method.includes('انستا')) {
                instapay += amt;
                instapayCount++;
            }
            else if (method.includes('WALLET') || method.includes('محفظ') || method.includes('فودافون')) {
                wallet += amt;
                walletCount++;
            }
            else if (method.includes('CARD') || method.includes('VISA') || method.includes('فيزا')) {
                card += amt;
                cardCount++;
            }
            else {
                cash += amt;
                cashCount++;
            }
        }
        const totalCollected = cash + instapay + wallet + card;
        return {
            totals: {
                cash,
                instapay,
                wallet,
                card,
                credit,
                totalCollected,
                totalSales,
                invoicesCount: sales.length,
            },
            counts: {
                cash: cashCount,
                instapay: instapayCount,
                wallet: walletCount,
                card: cardCount,
                credit: creditCount,
            },
            sales,
            debtPayments: externalDebtPayments,
        };
    }
    async syncBatch(batchData, username = 'OfflineSync') {
        const results = [];
        for (const op of batchData.operations) {
            try {
                if (op.entityType === 'SALE') {
                    const saleDto = {
                        ...op.payload,
                        idempotencyKey: op.idempotencyKey || op.operationId,
                        uuid: op.entityId,
                        deviceId: batchData.deviceId,
                        createdAt: op.createdAt || op.payload?.createdAt,
                    };
                    const sale = await this.createSale(saleDto, username);
                    results.push({ operationId: op.operationId, status: 'ACCEPTED', remoteId: sale.id });
                }
                else if (op.entityType === 'SALE_RETURN') {
                    await this.processSaleReturn(op.payload, username);
                    results.push({ operationId: op.operationId, status: 'ACCEPTED' });
                }
                else {
                    results.push({ operationId: op.operationId, status: 'IGNORED' });
                }
            }
            catch (err) {
                this.logger.error(`[syncBatch] Error processing op ${op.operationId}: ${err.message}`);
                results.push({ operationId: op.operationId, status: 'REJECTED', error: err.message });
            }
        }
        return {
            success: true,
            processedCount: results.filter((r) => r.status === 'ACCEPTED').length,
            acknowledgments: results,
        };
    }
    async processSaleReturn(returnDto, username = 'System') {
        const { originalSaleId, originalInvoiceNumber, branchId = 1, items, refundAmount = 0, refundMethod = 'CASH', reason = 'مرتجع مبيعات', performedBy, } = returnDto;
        const opUser = performedBy || username;
        return this.dataSource.transaction(async (manager) => {
            let originalSale = null;
            if (originalSaleId) {
                originalSale = await manager.findOne(branch_sale_entity_1.BranchSale, {
                    where: { id: Number(originalSaleId) },
                    relations: { items: true, customer: true },
                });
            }
            else if (originalInvoiceNumber) {
                originalSale = await manager.findOne(branch_sale_entity_1.BranchSale, {
                    where: { invoiceNumber: originalInvoiceNumber },
                    relations: { items: true, customer: true },
                });
            }
            const pendingMovements = [];
            if (Array.isArray(items) && items.length > 0) {
                const productIds = Array.from(new Set(items.map((it) => Number(it.productId)).filter((id) => !isNaN(id) && id > 0)));
                const inventories = await manager.find(branch_inventory_entity_1.BranchInventory, {
                    where: { branchId, productId: (0, typeorm_2.In)(productIds) },
                });
                const invMap = new Map();
                for (const inv of inventories) {
                    invMap.set(Number(inv.productId), inv);
                }
                const invUpdates = [];
                for (const it of items) {
                    const pId = Number(it.productId);
                    const qty = Number(it.quantity) || 0;
                    if (qty <= 0)
                        continue;
                    const inv = invMap.get(pId);
                    if (inv) {
                        const prevQty = Number(inv.currentQuantity || 0);
                        const newQty = prevQty + qty;
                        inv.currentQuantity = newQty;
                        invUpdates.push({ id: inv.id, newQty });
                        const movement = manager.create(stock_movement_entity_1.StockMovement, {
                            productId: pId,
                            branchId,
                            type: stock_movement_entity_1.StockMovementType.RETURN,
                            quantity: qty,
                            balanceBefore: prevQty,
                            balanceAfter: newQty,
                            referenceType: 'POS_RETURN',
                            referenceId: String(originalSale?.id || originalInvoiceNumber || 'RETURN'),
                            notes: `مرتجع مبيعات: ${reason}`,
                            performedBy: opUser,
                        });
                        pendingMovements.push(movement);
                    }
                }
                if (invUpdates.length > 0) {
                    const ids = invUpdates.map((u) => u.id).join(',');
                    const cases = invUpdates
                        .map((u) => `WHEN ${u.id} THEN ${u.newQty}`)
                        .join(' ');
                    await manager.query(`UPDATE branch_inventories SET currentQuantity = CASE id ${cases} END WHERE id IN (${ids})`);
                }
            }
            if (pendingMovements.length > 0) {
                await manager.save(stock_movement_entity_1.StockMovement, pendingMovements);
            }
            const customer = originalSale?.customer || (originalSale?.customerId ? await manager.findOne(customer_entity_1.Customer, { where: { id: originalSale.customerId } }) : null);
            if (customer && Number(refundAmount) > 0) {
                const refVal = Number(refundAmount);
                const prevDebt = Number(customer.currentDebt || 0);
                const newDebt = Math.max(0, prevDebt - refVal);
                customer.currentDebt = newDebt;
                customer.totalInvoiced = Math.max(0, Number(customer.totalInvoiced || 0) - refVal);
                await manager.save(customer);
                const ledgerEntry = manager.create(customer_debt_ledger_entity_1.CustomerDebtLedger, {
                    customerId: customer.id,
                    branchId,
                    transactionType: transaction_type_enum_1.TransactionType.PAYMENT,
                    invoiceNumber: `RET-${originalSale?.invoiceNumber || originalSale?.id || Date.now()}`,
                    relatedSaleId: originalSale?.id,
                    amount: refVal,
                    paidAmount: refVal,
                    balanceAfter: newDebt,
                    description: `مرتجع مبيعات فاتورة #${originalSale?.invoiceNumber || originalSale?.id || ''} (${reason})`,
                    invoiceDate: new Date().toISOString().split('T')[0],
                    paymentMethod: refundMethod === 'CREDIT' || refundMethod === 'حساب العميل' ? 'خصم مديونية' : refundMethod,
                    recordedBy: opUser,
                });
                await manager.save(ledgerEntry);
            }
            if (originalSale) {
                originalSale.status = 'RETURNED';
                await manager.save(originalSale);
            }
            this.cacheService.invalidatePattern(`inventory:${branchId}`);
            return {
                success: true,
                message: 'تم إرجاع الأصناف بنجاح واستعادة رصيد المخزون',
                refundAmount,
                originalSaleId: originalSale?.id,
            };
        });
    }
};
exports.PosService = PosService;
exports.PosService = PosService = PosService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(branch_sale_entity_1.BranchSale)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        activity_service_1.ActivityService,
        cache_service_1.MemoryCacheService,
        website_sync_service_1.WebsiteSyncService])
], PosService);
//# sourceMappingURL=pos.service.js.map