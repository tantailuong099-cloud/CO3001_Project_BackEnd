// CO3001_Project_BackEnd_main\src\course\dto\assign-tutor.dto.ts

import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsMongoId,
  ValidateNested,
  IsIn,
  Matches
} from 'class-validator';
import { Type } from 'class-transformer';

class SessionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ])
  day: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: "startTime must be HH:MM" })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: "startTime must be HH:MM" })
  endTime: string;
}

export class AssignTutorDto {
  @IsMongoId()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  classGroup: string; // e.g., "CC01", "CC02"

  @IsString()
  @IsNotEmpty()
  tutorId: string; // add this

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionDto)
  sessions: SessionDto[];
}
