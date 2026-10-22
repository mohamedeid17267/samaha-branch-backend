import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateSupplierDto {
  @IsNotEmpty({ message: 'اسم المورد مطلوب' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  supplierCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsNumber()
  initialDebt?: number;
}
