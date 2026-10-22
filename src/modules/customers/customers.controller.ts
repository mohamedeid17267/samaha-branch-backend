import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerPaymentDto } from './dto/payment.dto';
import { CustomerInvoiceDto } from './dto/customer-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto, @GetUser() user: User) {
    return this.customersService.create(createCustomerDto, user?.username);
  }

  @Get()
  findAll(
    @Query('branchId') branchId?: number,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.findAll(
      branchId ? Number(branchId) : undefined,
      search,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }

  @Post(':id/invoices')
  recordInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() invoiceDto: CustomerInvoiceDto,
    @GetUser() user: User,
  ) {
    return this.customersService.recordInvoice(id, invoiceDto, user?.username);
  }

  @Post(':id/payments')
  registerPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() paymentDto: CustomerPaymentDto,
    @GetUser() user: User,
  ) {
    return this.customersService.registerPayment(id, paymentDto, user?.username);
  }

  @Get(':id/ledger')
  getLedger(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.getStatement(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 100,
    );
  }

  @Get(':id/statement')
  getStatement(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.getStatement(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 100,
    );
  }
}
