import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
export class CreateFeedbackDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsMongoId()
  tutor: string; // student gửi id của tutor
}
