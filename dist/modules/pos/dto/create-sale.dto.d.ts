export declare class SaleItemDto {
    productId: number;
    quantity: number;
    unitPrice?: number;
}
export declare class CreateSaleDto {
    branchId: number;
    items: SaleItemDto[];
    discount?: number;
    paymentMethod?: string;
    saleType?: string;
    customerName?: string;
    customerId?: number;
    paidAmount?: number;
    remainingAmount?: number;
}
