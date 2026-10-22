import { BranchInventory } from './branch-inventory.entity';
import { OrderItem } from './order-item.entity';
export declare class Product {
    id: number;
    sku: string;
    supplierCode: string;
    branchId: number;
    name: string;
    costPrice: number;
    standardDistributerPrice: number;
    category: string;
    retailPrice: number;
    wholesalePrice: number;
    websitePrice: number;
    dozenPrice: number;
    images: string[];
    globalStock: number;
    createdAt: Date;
    updatedAt: Date;
    branchInventories: BranchInventory[];
    orderItems: OrderItem[];
}
