import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { Tutor, TutorDocument } from './schema/tutor.schema';
import { Student, StudentDocument } from './schema/student.schema';
import { Admin, AdminDocument } from './schema/admin.schema';

export type UpdateUserType = Partial<User | Tutor | Student | Admin>;

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserDocument> {
    const { role, email } = createUserDto;

    if (!['Tutor', 'Student', 'Admin'].includes(role)) {
      throw new BadRequestException('Invalid Role');
    }

    const existUser = await this.userModel.findOne({ email: email });
    if (existUser) {
      throw new ConflictException('Email is already use');
    }

    const newUser = new this.userModel(createUserDto);

    return newUser.save();
  }

  async getUserListByRole(role: 'Tutor' | 'Student' | 'Admin') {
    return this.userModel.discriminators?.[role].find({});
  }

  async getUserByEmail(email: string) {
    const existUser = await this.userModel.findOne({ email: email });
    if (!existUser) {
      throw new UnauthorizedException('Email is not exist');
    }
    return existUser;
  }

  async updateUserInfo(userId: string, updateUserDto: UpdateUserType) {
    try {
      const existUser = await this.userModel.findById(userId);
      if (!existUser) {
        throw new NotFoundException('User not found');
      }

      // lấy đúng discriminator model
      const roleModel = this.userModel.discriminators?.[
        existUser.role
      ] as Model<TutorDocument | StudentDocument | AdminDocument>;

      if (!roleModel) {
        throw new BadRequestException('Invalid user role');
      }

      const updatedUser = await roleModel
        .findByIdAndUpdate(userId, updateUserDto, { new: true })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException('Failed to update user');
      }

      return updatedUser;
    } catch (err) {
      throw new InternalServerErrorException(err);
    }
  }
}
