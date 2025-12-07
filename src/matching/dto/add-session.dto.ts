// src/matching/dto/add-session.dto.ts

import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class AddSessionDto {
  @IsString()
  @IsNotEmpty()
  courseId: string; // Lưu ý: Đây là _id của Registration (Class Group), không phải Course gốc

  @IsString()
  @IsNotEmpty()
  day: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(\d{1,2}):(\d{2})$/, { message: 'startTime must be HH:MM' })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(\d{1,2}):(\d{2})$/, { message: 'endTime must be HH:MM' })
  endTime: string;

  @IsString()
  @IsOptional()
  form?: string;

  @IsString()
  @IsOptional()
  location?: string;
  
}
