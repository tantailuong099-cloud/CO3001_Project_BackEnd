// src/matching/dto/update-attendance.dto.ts
import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateAttendanceDto {
  @IsString()
  @IsNotEmpty()
  courseId: string; // ID của Registration (Class Group)

  @IsNumber()
  @IsNotEmpty()
  sessionIndex: number; // Vị trí của buổi học trong mảng sessions (0, 1, 2...)

  @IsString()
  @IsNotEmpty()
  studentEmail: string;

  @IsBoolean()
  @IsNotEmpty()
  isPresent: boolean; // true = có mặt (add), false = vắng (remove)
}
