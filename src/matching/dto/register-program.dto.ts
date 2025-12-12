// src\matching\dto\register-program.dto.ts

import { IsNotEmpty, IsMongoId } from 'class-validator';

export class RegisterProgramDto {
  @IsMongoId()
  @IsNotEmpty()
  registrationId: string;
}
