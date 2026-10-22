import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
  Delete,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../database/entities/user.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { RoleEnum } from '../../common/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {

  @Delete(':id')
  @Roles(RoleEnum.HQ_ADMIN)
  async deleteOrder(@Param('id') id: string, @Req() req) {
    await this.ordersService.deleteOrder(+id, req.user.username);
    return { message: 'Deleted successfully' };
  }

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(BranchScopeGuard) // Auto-scopes branchId for Branch_Manager
  async create(@Body() createOrderDto: CreateOrderDto, @GetUser() user: User) {
    return this.ordersService.create(createOrderDto, user.username);
  }

  @Post('hq-invoice')
  async createHqInvoice(
    @Body() createOrderDto: CreateOrderDto,
    @GetUser() user: User,
  ) {
    if (user.role.name === RoleEnum.BRANCH_MANAGER) {
      throw new ForbiddenException(
        'Access Denied: Branch Managers cannot issue invoices directly',
      );
    }
    return this.ordersService.createInvoiceFromHq(
      createOrderDto,
      user.username,
    );
  }

  @Get()
  @UseGuards(BranchScopeGuard) // Limits Branch Managers to their own branch
  async findAll(
    @Query('branchId') branchId?: number,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('customerId') customerId?: number,
    @Query('targetType') targetType?: 'BRANCH' | 'CUSTOMER',
  ) {
    return this.ordersService.findAll(
      branchId ? Number(branchId) : undefined,
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      customerId ? Number(customerId) : undefined,
      targetType,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    const order = await this.ordersService.findOne(id);

    // Manual scope check for branch manager accessing single order details
    if (
      user.role.name === RoleEnum.BRANCH_MANAGER &&
      order.branchId !== user.branchId
    ) {
      throw new ForbiddenException(
        'Access Denied: You cannot view orders of another branch',
      );
    }

    return order;
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateOrderStatusDto,
    @GetUser() user: User,
  ) {
    const order = await this.ordersService.findOne(id);

    // Business Logic Rules:
    // 1. If modifying to APPROVED or SHIPPED, the user must be HQ Admin or HQ Staff.
    if (
      (updateDto.status === OrderStatus.APPROVED ||
        updateDto.status === OrderStatus.SHIPPED) &&
      user.role.name === RoleEnum.BRANCH_MANAGER
    ) {
      throw new ForbiddenException(
        'Access Denied: Branch Managers cannot approve or ship orders',
      );
    }

    // 2. If modifying to DELIVERED (confirming receipt), either HQ or the specific branch manager can do it.
    if (updateDto.status === OrderStatus.DELIVERED) {
      if (
        user.role.name === RoleEnum.BRANCH_MANAGER &&
        order.branchId !== user.branchId
      ) {
        throw new ForbiddenException(
          'Access Denied: You cannot confirm receipt for another branch',
        );
      }
    }

    return this.ordersService.updateStatus(id, updateDto, user.username);
  }
}
