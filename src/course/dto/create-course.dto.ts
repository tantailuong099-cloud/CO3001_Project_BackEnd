// CO3001_Project_BackEnd_main\src\course\dto\create-course.dto.ts

import { IsNotEmpty, IsOptional, IsString, IsNumber, IsArray, IsISO8601 } from 'class-validator';

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

  @IsNumber()
  @IsNotEmpty()
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
  @IsString({ each: true })
  @IsOptional()
  // optional initial pool of tutor ids
  tutors: string[];
}