import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { User } from '../../database/entities/user.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
export declare class OrdersController {
    private readonly ordersService;
    deleteOrder(id: string, req: any): Promise<{
        message: string;
    }>;
    constructor(ordersService: OrdersService);
    create(createOrderDto: CreateOrderDto, user: User): Promise<import("../../database/entities/purchase-order.entity").PurchaseOrder>;
    createHqInvoice(createOrderDto: CreateOrderDto, user: User): Promise<import("../../database/entities/purchase-order.entity").PurchaseOrder>;
    findAll(branchId?: number, status?: OrderStatus, page?: number, limit?: number, customerId?: number, targetType?: 'BRANCH' | 'CUSTOMER'): Promise<{
        data: import("../../database/entities/purchase-order.entity").PurchaseOrder[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number, user: User): Promise<import("../../database/entities/purchase-order.entity").PurchaseOrder>;
    updateStatus(id: number, updateDto: UpdateOrderStatusDto, user: User): Promise<import("../../database/entities/purchase-order.entity").PurchaseOrder>;
}
