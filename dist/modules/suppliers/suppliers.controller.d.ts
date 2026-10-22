import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierInvoiceDto } from './dto/supplier-invoice.dto';
import { SupplierPaymentDto } from './dto/supplier-payment.dto';
import { User } from '../../database/entities/user.entity';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    create(createSupplierDto: CreateSupplierDto, user: User): Promise<import("../../database/entities/supplier.entity").Supplier>;
    findAll(branchId?: number, search?: string, page?: number, limit?: number): Promise<{
        data: import("../../database/entities/supplier.entity").Supplier[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        summary: {
            totalSuppliers: number;
            totalInvoiced: number;
            totalPaid: number;
            totalCurrentDebt: number;
        };
    }>;
    findOne(id: number): Promise<import("../../database/entities/supplier.entity").Supplier>;
    update(id: number, updateSupplierDto: UpdateSupplierDto): Promise<import("../../database/entities/supplier.entity").Supplier>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    recordInvoice(id: number, invoiceDto: SupplierInvoiceDto, user: User): Promise<{
        success: boolean;
        supplier: import("../../database/entities/supplier.entity").Supplier;
        recordedInvoice: import("../../database/entities/supplier-debt-ledger.entity").SupplierDebtLedger;
        newDebt: number;
    }>;
    recordPayment(id: number, paymentDto: SupplierPaymentDto, user: User): Promise<{
        success: boolean;
        supplier: import("../../database/entities/supplier.entity").Supplier;
        payment: import("../../database/entities/supplier-debt-ledger.entity").SupplierDebtLedger;
        newDebt: number;
    }>;
    getLedger(id: number, page?: number, limit?: number): Promise<{
        supplier: import("../../database/entities/supplier.entity").Supplier;
        history: import("../../database/entities/supplier-debt-ledger.entity").SupplierDebtLedger[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        summary: {
            totalInvoiced: number;
            totalPaid: number;
            currentDebt: number;
        };
    }>;
    getStatement(id: number, page?: number, limit?: number): Promise<{
        supplier: import("../../database/entities/supplier.entity").Supplier;
        history: import("../../database/entities/supplier-debt-ledger.entity").SupplierDebtLedger[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        summary: {
            totalInvoiced: number;
            totalPaid: number;
            currentDebt: number;
        };
    }>;
}
