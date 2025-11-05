import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  courseName: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  duration: string;

  @IsNumber()
  @IsNotEmpty()
  capacity: number;

  @IsString()
  @IsNotEmpty()
  registrationStart: string;

  @IsString()
  @IsNotEmpty()
  registrationEnd: string;

  @IsString()
  @IsNotEmpty()
  courseStart: string;

  @IsString()
  @IsNotEmpty()
  courseEnd: string;

  @IsString()
  @IsNotEmpty()
  tutor: string;
}