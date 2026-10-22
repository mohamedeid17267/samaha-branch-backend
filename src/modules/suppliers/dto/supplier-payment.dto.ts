import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class SupplierPaymentDto {
  @IsNotEmpty({ message: 'مبلغ الدفعة مطلوب' })
  @IsNumber()
  @Min(0.01, { message: 'يجب أن يكون مبلغ الدفعة أكبر من 0' })
  amount: number;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  branchId?: number;
}
