import { Product } from './product.entity';
import { ImportContainer } from './import-container.entity';
export declare class MainOfficeInventory {
    id: number;
    productId: number;
    product: Product;
    containerId: number;
    container: ImportContainer;
    quantity: number;
    costPrice: number;
    createdAt: Date;
    updatedAt: Date;
}
