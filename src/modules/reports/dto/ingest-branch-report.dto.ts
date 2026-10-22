import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class IngestBranchReportDto {
  @IsString()
  @IsNotEmpty()
  branchCode: string;

  @IsString()
  @IsNotEmpty()
  branchName: string;

  @IsString()
  @IsNotEmpty()
  reportDate: string;

  @IsNumber()
  @IsNotEmpty()
  totalSales: number;

  @IsNumber()
  @IsOptional()
  totalOrders?: number;

  @IsNumber()
  @IsOptional()
  cashSales?: number;

  @IsNumber()
  @IsOptional()
  visaSales?: number;

  @IsNumber()
  @IsOptional()
  totalExpenses?: number;

  @IsNumber()
  @IsOptional()
  netProfit?: number;

  @IsNumber()
  @IsOptional()
  currentStockValue?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  rawDetails?: any;
}
