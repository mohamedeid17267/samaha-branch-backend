import { SupplierDebtLedger } from './supplier-debt-ledger.entity';
export declare class Supplier {
    id: number;
    branchId?: number;
    name: string;
    supplierCode?: string;
    phone?: string;
    address?: string;
    notes?: string;
    totalInvoiced: number;
    totalPaid: number;
    currentDebt: number;
    createdAt: Date;
    updatedAt: Date;
    debtLedgers: SupplierDebtLedger[];
}
