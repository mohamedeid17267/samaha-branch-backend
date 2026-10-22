import { Branch } from './branch.entity';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
export declare class PurchaseOrder {
    id: number;
    branchId: number;
    branch: Branch;
    customerId: number;
    customer: Customer;
    status: OrderStatus;
    totalAmount: number;
    paidAmount: number;
    discountPercentage: number;
    items: OrderItem[];
    createdAt: Date;
    updatedAt: Date;
}
