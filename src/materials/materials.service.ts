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

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name) private materialModel: Model<MaterialDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // async createMaterials(createMaterialsDto: CreateMaterialDto) {
  //   const newMetarials = new this.materialModel(createMaterialsDto);
  //   return newMetarials.save();
  // }

  async createMaterials(
    createMaterialDto: CreateMaterialDto,
    file: Express.Multer.File, // Nhận thêm file
  ): Promise<MaterialDocument> {
    try {
      // Upload file lên Cloudinary
      // Vì là file PDF, resource_type sẽ tự động là 'raw' hoặc 'image' tùy Cloudinary
      const uploadResult = await this.cloudinaryService.uploadFile(file);

      // Tạo object mới để lưu, bao gồm cả URL từ Cloudinary
      const newMaterialData = {
        ...createMaterialDto,
        pdfUrl: uploadResult.secure_url, // Gán URL vào pdfUrl
      };

      // Lưu vào MongoDB
      const newMaterial = new this.materialModel(newMaterialData);
      return newMaterial.save();
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
