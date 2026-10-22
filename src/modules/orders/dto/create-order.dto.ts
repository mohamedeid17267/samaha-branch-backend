import {
  IsNotEmpty,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  IsOptional,
  IsNumber,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsNotEmpty()
  @IsInt()
  productId: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  sellType?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  @IsIn(['BRANCH', 'CUSTOMER'])
  targetType?: 'BRANCH' | 'CUSTOMER';

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPaidAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;
}
