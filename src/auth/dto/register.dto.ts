// src/auth/dto/register.dto.ts

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  //IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@/user/schema/user.schema';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  // --- Dành cho Student ---
  @IsOptional()
  @IsString()
  major?: string;

  // --- Dành cho Tutor ---
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  // @Type(() => Number) // Nếu cần parse từ string sang number
  maxStudents?: number;

  // Avatar sẽ được xử lý qua File Interceptor, không cần validate ở đây
  avatar?: string;
}
