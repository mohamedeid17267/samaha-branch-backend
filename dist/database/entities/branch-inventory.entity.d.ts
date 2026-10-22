import { Branch } from './branch.entity';
import { Product } from './product.entity';
export declare class BranchInventory {
    id: number;
    branchId: number;
    branch: Branch;
    productId: number;
    product: Product;
    currentQuantity: number;
    sellingPrice: number;
    retailPrice: number;
    wholesalePrice: number;
    websitePrice: number;
    createdAt: Date;
    updatedAt: Date;
}
