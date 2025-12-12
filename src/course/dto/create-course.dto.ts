// CO3001_Project_BackEnd_main\src\course\dto\create-course.dto.ts

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsISO8601,
  IsMongoId,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  courseCode: string;

  @IsString()
  @IsNotEmpty()
  courseName: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  duration: string;

  @IsString()
  @IsNotEmpty()
  semester: string;

  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(30)
  capacity: number;

  @IsISO8601()
  registrationStart: string;

  @IsISO8601()
  registrationEnd: string;

  @IsISO8601()
  courseStart: string;

  @IsISO8601()
  courseEnd: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  classGroups: string[]; // auto-create CC01 - CC20 if not provided

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  // optional initial pool of tutor ids
  tutors: string[];
}
