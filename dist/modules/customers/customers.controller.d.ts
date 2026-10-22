import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerPaymentDto } from './dto/payment.dto';
import { CustomerInvoiceDto } from './dto/customer-invoice.dto';
import { User } from '../../database/entities/user.entity';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(createCustomerDto: CreateCustomerDto, user: User): Promise<import("../../database/entities/customer.entity").Customer>;
    findAll(branchId?: number, search?: string, page?: number, limit?: number): Promise<{
        data: import("../../database/entities/customer.entity").Customer[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        summary: {
            totalCustomers: number;
            totalInvoiced: number;
            totalPaid: number;
            totalCurrentDebt: number;
        };
    }>;
    findOne(id: number): Promise<import("../../database/entities/customer.entity").Customer>;
    update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<import("../../database/entities/customer.entity").Customer>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    recordInvoice(id: number, invoiceDto: CustomerInvoiceDto, user: User): Promise<{
        success: boolean;
        customer: import("../../database/entities/customer.entity").Customer;
        recordedInvoice: import("../../database/entities/customer-debt-ledger.entity").CustomerDebtLedger;
        newDebt: number;
    }>;
    registerPayment(id: number, paymentDto: CustomerPaymentDto, user: User): Promise<import("../../database/entities/customer-debt-ledger.entity").CustomerDebtLedger>;
    getLedger(id: number, page?: number, limit?: number): Promise<{
        customer: import("../../database/entities/customer.entity").Customer;
        history: import("../../database/entities/customer-debt-ledger.entity").CustomerDebtLedger[];
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
        customer: import("../../database/entities/customer.entity").Customer;
        history: import("../../database/entities/customer-debt-ledger.entity").CustomerDebtLedger[];
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
