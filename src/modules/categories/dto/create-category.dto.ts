import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'اسم التصنيف مطلوب' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(15, { message: 'الاختصار يجب ألا يتجاوز 15 حرفاً' })
  prefix?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  prefix?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
