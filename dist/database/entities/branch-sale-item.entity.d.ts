import { BranchSale } from './branch-sale.entity';
import { Product } from './product.entity';
export declare class BranchSaleItem {
    id: number;
    saleId: number;
    sale: BranchSale;
    productId: number;
    product: Product;
    quantity: number;
    unitPrice: number;
    subTotal: number;
}
