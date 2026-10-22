import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;



  @IsOptional()
  monthlyRoyalty?: number;

  @IsOptional()
  royaltyDueDay?: number;

  @IsOptional()
  @IsString()
  managerUsername?: string;

  @IsOptional()
  @IsString()
  managerPassword?: string;

  @IsOptional()
  @IsString()
  managerFullName?: string;
}
