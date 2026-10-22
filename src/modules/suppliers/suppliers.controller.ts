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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierInvoiceDto } from './dto/supplier-invoice.dto';
import { SupplierPaymentDto } from './dto/supplier-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto, @GetUser() user: User) {
    return this.suppliersService.create(createSupplierDto, user?.username);
  }

  @Get()
  findAll(
    @Query('branchId') branchId?: number,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.suppliersService.findAll(
      branchId ? Number(branchId) : undefined,
      search,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.remove(id);
  }

  @Post(':id/invoices')
  recordInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() invoiceDto: SupplierInvoiceDto,
    @GetUser() user: User,
  ) {
    return this.suppliersService.recordInvoice(id, invoiceDto, user?.username);
  }

  @Post(':id/payments')
  recordPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() paymentDto: SupplierPaymentDto,
    @GetUser() user: User,
  ) {
    return this.suppliersService.recordPayment(id, paymentDto, user?.username);
  }

  @Get(':id/ledger')
  getLedger(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.suppliersService.getLedger(
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
    return this.suppliersService.getLedger(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 100,
    );
  }
}
