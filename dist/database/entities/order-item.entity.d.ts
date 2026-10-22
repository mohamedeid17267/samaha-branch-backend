import { PurchaseOrder } from './purchase-order.entity';
import { Product } from './product.entity';
export declare class OrderItem {
    id: number;
    purchaseOrderId: number;
    purchaseOrder: PurchaseOrder;
    productId: number;
    product: Product;
    quantity: number;
    unitPrice: number;
    sellType: string;
}
