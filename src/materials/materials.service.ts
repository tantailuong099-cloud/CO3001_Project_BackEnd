import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Material, MaterialDocument } from './schema/materials.schema';
import { Model } from 'mongoose';
import { CreateMaterialDto } from './dto/create-materials.dto';
import { UpdateMaterialDto } from './dto/update-materials.dto';
import { CloudinaryService } from '@/cloudinary/cloudinary.service';
import {
  Registration,
  RegistrationDocument,
} from 'src/matching/schema/registration.schema';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name) private materialModel: Model<MaterialDocument>,
    @InjectModel(Registration.name)
    private registrationModel: Model<RegistrationDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // async createMaterials(createMaterialsDto: CreateMaterialDto) {
  //   const newMetarials = new this.materialModel(createMaterialsDto);
  //   return newMetarials.save();
  // }

  async createMaterials(
    createMaterialDto: CreateMaterialDto,
    file: Express.Multer.File, // Nhận thêm file
    userId: string,
  ) {
    try {
      // Upload file lên Cloudinary
      // Vì là file PDF, resource_type sẽ tự động là 'raw' hoặc 'image' tùy Cloudinary
      const uploadResult = await this.cloudinaryService.uploadFile(file);

      if (!createMaterialDto.author) {
        createMaterialDto.author = userId;
      }

      // Tạo object mới để lưu, bao gồm cả URL từ Cloudinary
      const newMaterialData = {
        ...createMaterialDto,
        pdfUrl: uploadResult.secure_url, // Gán URL vào pdfUrl
      };

      // Lưu vào MongoDB
      const newMaterial = new this.materialModel(newMaterialData).save();
      const materialId = (await newMaterial)._id.toString();

      // 3. Update ID vào Collection 'registrations'
      // Xác định trường cần push dựa trên sharedType
      let updateField = '';

      // sharedType gửi lên từ FE: "slide", "reference", "general"
      switch (createMaterialDto.sharedType) {
        case 'slide':
          updateField = 'materials.slide';
          break;
        case 'reference':
          updateField = 'materials.reference';
          break;
        case 'general':
          updateField = 'materials.general';
          break;
        default:
          // Nếu không khớp type nào, có thể throw lỗi hoặc mặc định vào general
          updateField = 'materials.general';
      }

      // Thực hiện push ID vào mảng tương ứng
      const updatedRegistration =
        await this.registrationModel.findByIdAndUpdate(
          createMaterialDto.courseId,
          {
            $push: { [updateField]: materialId }, // Dynamic key: vd "materials.slide"
          },
          { new: true }, // Trả về document mới sau khi update (để debug nếu cần)
        );

      if (!updatedRegistration) {
        // Nếu không tìm thấy Registration, có thể rollback (xóa material vừa tạo)
        // await this.materialModel.findByIdAndDelete(materialId);
        throw new NotFoundException(
          'Registration Course not found to link material.',
        );
      }

      return newMaterial;
    } catch (err) {
      // Xử lý lỗi nếu upload hoặc save thất bại
      throw new InternalServerErrorException(
        err.message || 'Failed to create material',
      );
    }
  }

  async updateMaterial(updateMaterialDto: UpdateMaterialDto, id: string) {
    try {
      const updatedMaterial = await this.materialModel
        .findOneAndUpdate({ _id: id }, updateMaterialDto, { new: true })
        .exec();

      if (!updatedMaterial) {
        throw new NotFoundException(`Material not found`);
      }

      return updatedMaterial;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async getAll() {
    return await this.materialModel.find({});
  }

  async getById(id: string) {
    return await this.materialModel.findById(id);
  }

  async getSharedMaterial() {
    return this.materialModel.find({
      type: 'shared',
    });
  }

  async getOfficialMaterial() {
    return this.materialModel.find({
      type: 'official',
    });
  }
}
