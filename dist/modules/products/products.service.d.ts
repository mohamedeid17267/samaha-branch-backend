import { Repository, EntityManager } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { StockMovement, StockMovementType } from '../../database/entities/stock-movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ActivityService } from '../activity/activity.service';
import { MemoryCacheService } from '../../common/services/cache.service';
import { WebsiteSyncService } from '../../common/services/website-sync.service';
export declare class ProductsService {
    private productRepository;
    private branchInventoryRepository;
    private stockMovementRepository;
    private activityService;
    private cacheService;
    private websiteSyncService;
    constructor(productRepository: Repository<Product>, branchInventoryRepository: Repository<BranchInventory>, stockMovementRepository: Repository<StockMovement>, activityService: ActivityService, cacheService: MemoryCacheService, websiteSyncService: WebsiteSyncService);
    create(createProductDto: CreateProductDto): Promise<Product>;
    recordStockMovement(managerOrRepo: EntityManager | Repository<StockMovement>, data: {
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
    }): Promise<StockMovement>;
    createLocal(createProductDto: CreateProductDto, branchId: number): Promise<Product>;
    findAll(page?: number, limit?: number, search?: string): Promise<{
        data: Product[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<Product>;
    update(id: number, updateDto: any, username?: string): Promise<Product>;
    remove(id: number): Promise<{
        message: string;
    }>;
    updateGlobalStock(id: number, quantity: number): Promise<Product>;
    getBranchInventory(branchId: number, page?: number, limit?: number, search?: string): Promise<{
        data: BranchInventory[];
        total: number;
        page: number;
        limit: number;
    }>;
    recordSale(branchId: number, productId: number, quantity: number, sellingPrice: number, username?: string): Promise<BranchInventory>;
    recordWaste(branchId: number, productId: number, quantity: number, reason: string, username?: string): Promise<BranchInventory>;
    updateSellingPrice(branchId: number, productId: number, sellingPrice?: number, username?: string, extraPrices?: {
        retailPrice?: number;
        wholesalePrice?: number;
        websitePrice?: number;
        costPrice?: number;
    }): Promise<BranchInventory>;
    importCsv(csvText: string, username?: string): Promise<{
        successCount: number;
        errors: string[];
    }>;
    stockIn(branchId: number, skuOrBarcode: string, quantity?: number, username?: string, sessionId?: string): Promise<{
        success: boolean;
        product: Product;
        addedQuantity: number;
        currentQuantity: number;
        sellingPrice: number;
        message: string;
    }>;
    findByBarcodeOrSku(branchId: number, code: string): Promise<any>;
    adjustStock(branchId: number, productId: number, newQuantity: number, reason: string, username?: string): Promise<{
        success: boolean;
        newQuantity: number;
        movement: StockMovement;
    }>;
    getProductStockMovements(productId: number, branchId?: number, limit?: number): Promise<{
        product: Product;
        branchInventory?: BranchInventory;
        currentQuantity: number;
        summary: {
            totalIn: number;
            totalOut: number;
            currentQuantity: number;
        };
        movements: StockMovement[];
    }>;
    syncLookup(code: string, branchId?: number): Promise<{
        found: boolean;
        message: string;
        productId?: undefined;
        name?: undefined;
        sku?: undefined;
        supplierCode?: undefined;
        stock?: undefined;
        websitePrice?: undefined;
        wholesalePrice?: undefined;
        retailPrice?: undefined;
    } | {
        found: boolean;
        productId: number;
        name: string;
        sku: string;
        supplierCode: string;
        stock: number;
        websitePrice: number;
        wholesalePrice: number;
        retailPrice: number;
        message?: undefined;
    }>;
    syncCatalog(branchId?: number): Promise<{
        id: number;
        name: string;
        sku: string;
        supplierCode: string;
        stock: number;
        websitePrice: number;
        wholesalePrice: number;
        retailPrice: number;
    }[]>;
}
