export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: 'Tutor' | 'Student' | 'Admin';
  avatar?: string;
}
