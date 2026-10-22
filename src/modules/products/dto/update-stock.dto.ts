import { IsNotEmpty, IsInt, Min } from 'class-validator';

export class UpdateStockDto {
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  quantity: number;
}
