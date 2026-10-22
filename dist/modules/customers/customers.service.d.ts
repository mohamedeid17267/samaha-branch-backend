import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { CustomerDebtLedger } from '../../database/entities/customer-debt-ledger.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerPaymentDto } from './dto/payment.dto';
import { CustomerInvoiceDto } from './dto/customer-invoice.dto';
import { ActivityService } from '../activity/activity.service';
export declare class CustomersService implements OnApplicationBootstrap {
    private customerRepository;
    private ledgerRepository;
    private dataSource;
    private activityService;
    constructor(customerRepository: Repository<Customer>, ledgerRepository: Repository<CustomerDebtLedger>, dataSource: DataSource, activityService: ActivityService);
    onApplicationBootstrap(): Promise<void>;
    handleDailyCustomerDebtCheck(): Promise<void>;
    checkAllCustomersLateDebt(): Promise<void>;
    checkLateCustomerDebtAndNotify(customer: Customer): Promise<void>;
    create(createCustomerDto: CreateCustomerDto, username?: string): Promise<Customer>;
    findAll(branchId?: number, search?: string, page?: number, limit?: number): Promise<{
        data: Customer[];
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
    findOne(id: number): Promise<Customer>;
    update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<Customer>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    recordInvoice(customerId: number, dto: CustomerInvoiceDto, username?: string): Promise<{
        success: boolean;
        customer: Customer;
        recordedInvoice: CustomerDebtLedger;
        newDebt: number;
    }>;
    registerPayment(id: number, paymentDto: CustomerPaymentDto, username?: string): Promise<CustomerDebtLedger>;
    getStatement(id: number, page?: number, limit?: number): Promise<{
        customer: Customer;
        history: CustomerDebtLedger[];
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
    getLedger(id: number, page?: number, limit?: number): Promise<any>;
}
