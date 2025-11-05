import { UserRole } from '@/user/schema/user.schema';

export class RegisterDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  // avatar?: string;
}
