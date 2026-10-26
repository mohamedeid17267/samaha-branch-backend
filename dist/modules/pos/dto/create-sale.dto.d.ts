export declare class SaleItemDto {
    productId: number;
    name?: string;
    sku?: string;
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
    idempotencyKey?: string;
    uuid?: string;
    invoiceNumber?: string;
    deviceId?: string;
    createdAt?: string;
    splitPayments?: any;
}
export declare class ReturnSaleItemDto {
    productId: number;
    quantity: number;
    unitPrice?: number;
}
export declare class ReturnSaleDto {
    originalSaleId?: number;
    originalInvoiceNumber?: string;
    branchId: number;
    items: ReturnSaleItemDto[];
    refundAmount: number;
    refundMethod?: string;
    reason?: string;
    performedBy?: string;
    createdAt?: string;
}
