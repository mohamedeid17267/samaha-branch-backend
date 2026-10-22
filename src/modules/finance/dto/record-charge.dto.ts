import { IsNotEmpty, IsInt, IsNumber, IsString, Min } from 'class-validator';

export class RecordChargeDto {
  @IsNotEmpty()
  @IsInt()
  branchId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  description: string;
}
