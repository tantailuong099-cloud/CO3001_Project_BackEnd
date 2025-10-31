import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}