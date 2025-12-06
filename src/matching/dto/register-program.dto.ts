// src\matching\dto\register-program.dto.ts

import { IsNotEmpty, IsMongoId, IsOptional, IsArray, IsString } from 'class-validator';

export class RegisterProgramDto {
  @IsNotEmpty()
  @IsMongoId()
  course: string; // the course/program id the student wants to join

  @IsNotEmpty()
  @IsString()
  classGroup: string; // the class group the student wants to join

  @IsOptional()
  @IsMongoId()
  tutor?: string; // optional: student selected tutor id
}
