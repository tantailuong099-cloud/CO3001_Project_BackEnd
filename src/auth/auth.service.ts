import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    // private userService: UsersService,
    private jwtService: JwtService,
  ) {}
}
