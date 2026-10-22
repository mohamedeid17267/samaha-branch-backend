import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  Length,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'اسم المستخدم مطلوب' })
  @IsString()
  @Length(2, 50, { message: 'اسم المستخدم يجب أن يكون بين 2 و 50 حرف' })
  username: string;

  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  email?: string;

  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @IsString()
  @Length(4, 100, { message: 'كلمة المرور يجب ألا تقل عن 4 أحرف' })
  password: string;

  @IsNotEmpty({ message: 'يرجى تحديد الدور' })
  @IsInt()
  roleId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  permissions?: string[];
}

