// src\matching\dto\register-program.dto.ts

import { IsNotEmpty, IsMongoId, IsOptional, IsArray, IsString } from 'class-validator';
import { RegistrationStatus } from '../schema/registration.schema';

export class RegisterProgramDto {
  @IsNotEmpty()
  @IsMongoId()
  course: string; // the program/course id the student wants to join

  @IsOptional()
  @IsMongoId()
  tutor?: string; // optional: student selected tutor id

  // Optional preferred timeslots example (free text or an array of time slot ids)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTimeSlots?: string[];
}
