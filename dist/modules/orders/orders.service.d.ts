import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { Product } from '../../database/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { ActivityService } from '../activity/activity.service';
export declare class OrdersService {
    private orderRepository;
    private productRepository;
    private dataSource;
    private activityService;
    deleteOrder(id: number, username: string): Promise<void>;
    constructor(orderRepository: Repository<PurchaseOrder>, productRepository: Repository<Product>, dataSource: DataSource, activityService: ActivityService);
    create(createOrderDto: CreateOrderDto, username?: string): Promise<PurchaseOrder>;
    findAll(branchId?: number, status?: OrderStatus, page?: number, limit?: number, customerId?: number, targetType?: 'BRANCH' | 'CUSTOMER'): Promise<{
        data: PurchaseOrder[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<PurchaseOrder>;
    updateStatus(id: number, updateDto: UpdateOrderStatusDto, username?: string): Promise<PurchaseOrder>;
    createInvoiceFromHq(createOrderDto: CreateOrderDto, username?: string): Promise<PurchaseOrder>;
}
