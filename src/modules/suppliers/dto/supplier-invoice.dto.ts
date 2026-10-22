import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class SupplierInvoiceDto {
  @IsNotEmpty({ message: 'إجمالي مبلغ الفاتورة مطلوب' })
  @IsNumber()
  @Min(0.01, { message: 'يجب أن يكون مبلغ الفاتورة أكبر من 0' })
  totalAmount: number;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  invoiceDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  branchId?: number;
}
