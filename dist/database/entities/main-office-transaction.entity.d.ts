import { Product } from './product.entity';
import { ImportContainer } from './import-container.entity';
export declare class MainOfficeTransaction {
    id: number;
    productId: number;
    product: Product;
    containerId: number;
    container: ImportContainer;
    type: string;
    quantity: number;
    balanceAfter: number;
    notes: string;
    createdAt: Date;
}
