import { OrderStatus } from '../../../common/enums/order-status.enum';
import { OrderItemDto } from './create-order.dto';
export declare class UpdateOrderStatusDto {
    status: OrderStatus;
    items?: OrderItemDto[];
}
