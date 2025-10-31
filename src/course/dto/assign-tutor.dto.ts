import { IsNotEmpty, IsString } from 'class-validator';

export class AssignTutorDto {
  @IsString()
  @IsNotEmpty()
  tutorId: string;
}