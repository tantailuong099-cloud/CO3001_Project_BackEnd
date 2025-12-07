// src\matching\dto\set-constraints.dto.ts

import {
  IsMongoId,
  IsArray,
  IsString,
  ValidateNested,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * This is the DTO for a single session's schedule.
 */
class SessionDto {
  @IsString()
  @IsNotEmpty()
  day: string;

  @IsString()
  @IsNotEmpty()
  startTime: string; // e.g., "09:00"

  @IsString()
  @IsNotEmpty()
  endTime: string; // e.g., "11:00"

  @IsString()
  @IsOptional()
  form?: string;

  @IsString()
  @IsOptional()
  location: string;

  @IsString()
  @IsOptional()
  studentAttemp?: string[];

  @IsString()
  @IsOptional()
  status?: string; // thêm vào
}

/**
 * This is the main DTO a tutor submits to set the final schedule for a specific course.
 */
export class SetScheduleDto {
  /**
   * The ID of the course to which this schedule applies.
   */
  @IsMongoId()
  @IsNotEmpty()
  courseId: string;

  @IsNotEmpty()
  @IsString()
  classGroup: string; // specify the class group for this schedule

  /**
   * The array of session times for this course.
   */
  @IsArray()
  @ValidateNested({ each: true }) // Validates each object in the array
  @Type(() => SessionDto) // Tells class-validator to use SessionDto
  sessions: SessionDto[];
}
