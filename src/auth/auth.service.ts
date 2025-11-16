import { UserService } from '@/user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { Response, Request } from 'express';
import { CloudinaryService } from '@/cloudinary/cloudinary.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async register(registerDto: RegisterDto, file?: Express.Multer.File) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    let avatarUrl: string | undefined;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      avatarUrl = uploadResult.secure_url;
    }

    const newUser = this.userService.createUser({
      ...registerDto,
      password: hashedPassword,
      avatar: avatarUrl,
    });

    return newUser;
  }

  async login(loginDto: LoginDto, res: Response) {
    const existUser = await this.userService.getUserByEmail(loginDto.email);

    console.log(existUser);
    console.log((await existUser).password);
    console.log(loginDto.password);

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      (await existUser).password,
    );

    console.log(isValidPassword);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = this.jwtService.sign({
      userId: (await existUser)._id,
      email: (await existUser).email,
      role: (await existUser).role,
    });

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return { access_token };
  }

  logout(res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return {
      code: 'success',
      message: 'Logged out Successfully',
    };
  }

  async verifyToken(req: Request) {
    try {
      const token = req.cookies?.access_token;
      if (!token) {
        throw new UnauthorizedException('Invalid Credentials');
      }

      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const existUser = await this.userService.getUserByEmail(decoded.email);

      if (!existUser || (await existUser)._id.toString() !== decoded.userId) {
        throw new UnauthorizedException('Invalide credentials');
      }

      return {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      throw new UnauthorizedException(error);
    }
  }
}
