import { Product } from './product.entity';
import { Branch } from './branch.entity';
export declare enum StockMovementType {
    IN_SUPPLY = "IN_SUPPLY",
    OUT_SALE = "OUT_SALE",
    WASTE = "WASTE",
    ADJUSTMENT = "ADJUSTMENT",
    RETURN = "RETURN",
    INITIAL = "INITIAL"
}
export declare class StockMovement {
    id: number;
    productId: number;
    product: Product;
    branchId?: number;
    branch?: Branch;
    type: StockMovementType;
    quantity: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    performedBy?: string;
    createdAt: Date;
}
