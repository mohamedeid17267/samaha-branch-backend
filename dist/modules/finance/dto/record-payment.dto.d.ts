export declare enum LedgerType {
    ROYALTY = "ROYALTY",
    INVENTORY_DEBT = "INVENTORY_DEBT",
    INVENTORY = "INVENTORY"
}
export declare class RecordPaymentDto {
    branchId: number;
    ledgerType: LedgerType;
    amount: number;
    description?: string;
    receiptUrl?: string;
    relatedOrderId?: number;
}
