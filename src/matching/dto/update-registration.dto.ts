import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateRegistrationDto {
  /**
   * Admin can assign or unassign a tutor
   */
  @IsOptional()
  @IsString()
  tutor?: string | null;

  /**
   * Admin can change registration status
   */
  @IsOptional()
  @IsIn(['created', 'tutor_assigned', 'active', 'closed'])
  status?: 'created' | 'tutor_assigned' | 'active' | 'closed';
}