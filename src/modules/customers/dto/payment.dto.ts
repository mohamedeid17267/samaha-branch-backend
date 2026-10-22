import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';

export class CustomerPaymentDto {
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
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsNumber()
  branchId?: number;
}

