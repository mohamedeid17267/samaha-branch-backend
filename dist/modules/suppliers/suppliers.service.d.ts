import { Repository } from 'typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { SupplierDebtLedger } from '../../database/entities/supplier-debt-ledger.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierInvoiceDto } from './dto/supplier-invoice.dto';
import { SupplierPaymentDto } from './dto/supplier-payment.dto';
export declare class SuppliersService {
    private readonly supplierRepo;
    private readonly ledgerRepo;
    constructor(supplierRepo: Repository<Supplier>, ledgerRepo: Repository<SupplierDebtLedger>);
    create(dto: CreateSupplierDto, username?: string): Promise<Supplier>;
    findAll(branchId?: number, search?: string, page?: number, limit?: number): Promise<{
        data: Supplier[];
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
    findOne(id: number): Promise<Supplier>;
    update(id: number, dto: UpdateSupplierDto): Promise<Supplier>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    recordInvoice(supplierId: number, dto: SupplierInvoiceDto, username?: string): Promise<{
        success: boolean;
        supplier: Supplier;
        recordedInvoice: SupplierDebtLedger;
        newDebt: number;
    }>;
    recordPayment(supplierId: number, dto: SupplierPaymentDto, username?: string): Promise<{
        success: boolean;
        supplier: Supplier;
        payment: SupplierDebtLedger;
        newDebt: number;
    }>;
    getLedger(supplierId: number, page?: number, limit?: number): Promise<{
        supplier: Supplier;
        history: SupplierDebtLedger[];
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
