import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  courseName: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  duration: string;

  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsNumber()
  @IsOptional()
  numberOfStudents: number;

  @IsString()
  @IsOptional()
  tutor: string;
}