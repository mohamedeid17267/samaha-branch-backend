import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { User } from '../../database/entities/user.entity';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(createProductDto: CreateProductDto): Promise<import("../../database/entities/product.entity").Product>;
    createLocal(createProductDto: CreateProductDto, explicitBranchId: number, user: User): Promise<import("../../database/entities/product.entity").Product>;
    importCsv(csvText: string, user: User): Promise<{
        successCount: number;
        errors: string[];
    }>;
    findAll(page?: number, limit?: number, search?: string): Promise<{
        data: import("../../database/entities/product.entity").Product[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<import("../../database/entities/product.entity").Product>;
    update(id: number, updateProductDto: any, user: User): Promise<import("../../database/entities/product.entity").Product>;
    remove(id: number): Promise<{
        message: string;
    }>;
    updateGlobalStock(id: number, updateStockDto: UpdateStockDto): Promise<import("../../database/entities/product.entity").Product>;
    getBranchInventory(branchId: number, page?: number, limit?: number, search?: string): Promise<{
        data: import("../../database/entities/branch-inventory.entity").BranchInventory[];
        total: number;
        page: number;
        limit: number;
    }>;
    recordSale(branchId: number, productId: number, quantity: number, sellingPrice: number, user: User): Promise<import("../../database/entities/branch-inventory.entity").BranchInventory>;
    recordWaste(branchId: number, productId: number, quantity: number, reason: string, user: User): Promise<import("../../database/entities/branch-inventory.entity").BranchInventory>;
    updateSellingPrice(branchId: number, productId: number, user: User, sellingPrice?: number, retailPrice?: number, wholesalePrice?: number, websitePrice?: number, costPrice?: number): Promise<import("../../database/entities/branch-inventory.entity").BranchInventory>;
    updateBranchProduct(branchId: number, productId: number, user: User, updateDto: any): Promise<any>;
    stockIn(branchId: number, sku: string, barcode: string, quantity: number, sessionId: string, user: User): Promise<{
        success: boolean;
        product: import("../../database/entities/product.entity").Product;
        addedQuantity: number;
        currentQuantity: number;
        sellingPrice: number;
        message: string;
    }>;
    findByCode(branchId: number, code: string): Promise<any>;
    getProductStockMovements(id: number, branchId?: number, limit?: number): Promise<{
        product: import("../../database/entities/product.entity").Product;
        branchInventory?: import("../../database/entities/branch-inventory.entity").BranchInventory;
        currentQuantity: number;
        summary: {
            totalIn: number;
            totalOut: number;
            currentQuantity: number;
        };
        movements: import("../../database/entities/stock-movement.entity").StockMovement[];
    }>;
    adjustStock(id: number, branchId: number, newQuantity: number, reason: string, user: User): Promise<{
        success: boolean;
        newQuantity: number;
        movement: import("../../database/entities/stock-movement.entity").StockMovement;
    }>;
}
