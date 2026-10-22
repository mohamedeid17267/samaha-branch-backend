export declare class OrderItemDto {
    productId: number;
    quantity: number;
    sellType?: string;
}
export declare class CreateOrderDto {
    targetType?: 'BRANCH' | 'CUSTOMER';
    branchId?: number;
    customerId?: number;
    items: OrderItemDto[];
    initialPaidAmount?: number;
    discountPercentage?: number;
}
