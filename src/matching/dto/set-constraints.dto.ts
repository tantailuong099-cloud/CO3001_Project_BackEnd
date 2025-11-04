import { IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ConstraintDto {
  @IsString()
  day: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

export class SetConstraintsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSubjects?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstraintDto)
  constraints?: ConstraintDto[];

  @IsOptional()
  @IsString()
  preferredStudentLevel?: string;

  // no tutorId here — we'll take tutor identity from JWT
}