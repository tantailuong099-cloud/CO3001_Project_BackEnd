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
import { Model, UpdateQuery } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { Tutor, TutorDocument } from './schema/tutor.schema';
import { Student, StudentDocument } from './schema/student.schema';
import { Admin, AdminDocument } from './schema/admin.schema';

export type UpdateUserType = UpdateQuery<
  Partial<User | Tutor | Student | Admin>
>;

// Định nghĩa kiểu dữ liệu mở rộng để bao gồm các trường riêng của Student/Tutor
// vì CreateUserDto gốc có thể chỉ chứa các trường chung.
type ExtendedUserDto = CreateUserDto & {
  major?: string;
  department?: string;
  maxStudents?: number;
  studentId?: string;
  tutorId?: string;
  avatar?: string;
};

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // ---------------------------------------------------------
  // 👇 1. Logic sinh Student ID (Format: YYYYxxxx - VD: 20250001)
  // ---------------------------------------------------------
  private async generateStudentId(): Promise<string> {
    const studentModel = this.userModel.discriminators?.[
      'Student'
    ] as Model<StudentDocument>;

    if (!studentModel) {
      throw new InternalServerErrorException('Student model not found');
    }

    // Tìm sinh viên có ID lớn nhất
    const lastStudent = await studentModel
      .findOne({})
      .sort({ studentId: -1 })
      .exec();

    const currentYear = new Date().getFullYear().toString(); // "2025"

    // Nếu chưa có sinh viên nào, hoặc ID cũ không đúng format -> Bắt đầu mới
    if (!lastStudent || !lastStudent.studentId) {
      return `${currentYear}0001`;
    }

    // Nếu qua năm mới (VD: ID cũ 2024..., năm nay 2025) -> Reset về 20250001
    if (!lastStudent.studentId.startsWith(currentYear)) {
      return `${currentYear}0001`;
    }

    // Logic tăng dần: Lấy 4 số đuôi + 1
    // VD: 20250001 -> 0001 -> 1 + 1 = 2 -> 0002
    const lastSequence = parseInt(lastStudent.studentId.slice(4));
    const nextSequence = lastSequence + 1;

    return `${currentYear}${nextSequence.toString().padStart(4, '0')}`;
  }

  // ---------------------------------------------------------
  // 👇 2. Logic sinh Tutor ID (Format: Txxxxxx - VD: T000001)
  // ---------------------------------------------------------
  private async generateTutorId(): Promise<string> {
    const tutorModel = this.userModel.discriminators?.[
      'Tutor'
    ] as Model<TutorDocument>;

    if (!tutorModel) {
      throw new InternalServerErrorException('Tutor model not found');
    }

    // Tìm gia sư có ID lớn nhất
    const lastTutor = await tutorModel.findOne({}).sort({ tutorId: -1 }).exec();

    if (!lastTutor || !lastTutor.tutorId) {
      return 'T000001';
    }

    // Tách chữ T, lấy số + 1
    const lastSequence = parseInt(lastTutor.tutorId.replace('T', ''));
    if (isNaN(lastSequence)) return 'T000001'; // Fallback nếu dữ liệu rác

    const nextSequence = lastSequence + 1;

    return `T${nextSequence.toString().padStart(6, '0')}`;
  }

  // ---------------------------------------------------------
  // 👇 3. Cập nhật hàm Create User
  // ---------------------------------------------------------
  async createUser(createUserDto: ExtendedUserDto): Promise<UserDocument> {
    const { role, email } = createUserDto;

    if (!['Tutor', 'Student', 'Admin'].includes(role)) {
      throw new BadRequestException('Invalid Role');
    }

    const existUser = await this.userModel.findOne({ email: email });
    if (existUser) {
      throw new ConflictException('Email is already use');
    }

    // Chuẩn bị dữ liệu để lưu
    // Clone object để tránh đột biến tham chiếu
    const userData = { ...createUserDto };

    // --- Xử lý riêng cho Student ---
    if (role === 'Student') {
      userData.studentId = await this.generateStudentId();

      // Validate bắt buộc phải có major
      if (!userData.major) {
        throw new BadRequestException('Major is required for Student');
      }
    }
    // --- Xử lý riêng cho Tutor ---
    else if (role === 'Tutor') {
      userData.tutorId = await this.generateTutorId();

      // Validate bắt buộc phải có department
      if (!userData.department) {
        throw new BadRequestException('Department is required for Tutor');
      }

      // Mặc định maxStudents nếu không truyền
      if (!userData.maxStudents) {
        userData.maxStudents = 20;
      }
    }

    // Lưu vào DB (Mongoose sẽ tự động map vào đúng Collection con dựa trên Discriminator)
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  // ---------------------------------------------------------
  // Các hàm bên dưới giữ nguyên
  // ---------------------------------------------------------

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

  async findById(id: string) {
    return this.userModel.findById(id);
  }

  /**
   * Get multiple students by email array
   */
  async getStudentsByEmails(emails: string[]): Promise<StudentDocument[]> {
    const studentModel = this.userModel.discriminators?.[
      'Student'
    ] as Model<StudentDocument>;
    if (!studentModel) throw new BadRequestException('Student model not found');

    return studentModel.find({ email: { $in: emails } }).exec();
  }
}
