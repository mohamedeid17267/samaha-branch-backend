import {
  IsNotEmpty,
  IsInt,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';

export enum LedgerType {
  ROYALTY = 'ROYALTY',
  INVENTORY_DEBT = 'INVENTORY_DEBT',
  INVENTORY = 'INVENTORY',
}

export class RecordPaymentDto {
  @IsNotEmpty()
  @IsInt()
  branchId: number;

  @IsNotEmpty()
  @IsEnum(LedgerType)
  ledgerType: LedgerType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsInt()
  relatedOrderId?: number;
}
