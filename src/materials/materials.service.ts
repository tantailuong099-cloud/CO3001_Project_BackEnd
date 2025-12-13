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

  async deleteMaterial(materialId: string): Promise<MaterialDocument> {
    // 1. Tìm tài liệu trong DB để lấy thông tin cần thiết
    const materialToDelete = await this.materialModel.findById(materialId);

    if (!materialToDelete) {
      throw new NotFoundException(
        `Material with ID "${materialId}" not found.`,
      );
    }

    // 2. Trích xuất thông tin quan trọng từ tài liệu
    // Trong schema của bạn không có courseId, nhưng logic tạo lại có.
    // Giả sử courseId được lưu trong material document. Nếu không, bạn cần điều chỉnh.
    const { sharedType } = materialToDelete;
    // Lấy courseId từ DTO hoặc từ chính material nếu đã lưu
    // Ví dụ: const courseId = materialToDelete.courseId;
    // Để ví dụ này chạy, ta sẽ giả định courseId được truyền vào hàm
    // Hoặc bạn phải thêm trường courseId vào MaterialSchema
    // --> Để đơn giản, ta sẽ dựa vào logic là FE sẽ gửi cả courseId và materialId
    // --> Cách tốt hơn là lưu `courseId` vào `MaterialSchema` lúc tạo.
    // --> Ở đây, tôi sẽ cập nhật logic để lấy `courseId` từ `registration` luôn.

    try {
      // 3. Xóa file trên Cloudinary
      // if (pdfUrl) {
      //   // Cloudinary cần `public_id` để xóa, không phải URL đầy đủ.
      //   // `public_id` là phần cuối trong URL, không bao gồm extension.
      //   // Ví dụ URL: "http://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
      //   // -> public_id: "sample"
      //   // Nếu có thư mục: "folder/sample"
      //   const publicId = this.extractPublicIdFromUrl(pdfUrl);

      //   // API của Cloudinary có thể yêu cầu `resource_type` nếu không phải là ảnh.
      //   // Vì là file PDF, nó có thể là 'raw' hoặc 'image'.
      //   // Ta nên chỉ định rõ để tránh lỗi.
      //   await this.cloudinaryService.uploader.destroy(publicId, {
      //     resource_type: 'raw', // Hoặc 'image' tùy vào cách bạn upload
      //   });
      // }

      // 4. Gỡ bỏ ID của tài liệu khỏi mảng trong `registrations`
      const updateField = `materials.${sharedType}`; // vd: "materials.slide"

      // Sử dụng toán tử $pull để xóa materialId khỏi mảng tương ứng
      // Ta cần tìm registration nào chứa materialId này
      await this.registrationModel.findOneAndUpdate(
        { [updateField]: materialId }, // Tìm document registration có materialId trong mảng
        {
          $pull: { [updateField]: materialId },
        },
      );

      // 5. Xóa document tài liệu khỏi collection 'materials'
      const deletedMaterial =
        await this.materialModel.findByIdAndDelete(materialId);

      if (!deletedMaterial) {
        // Trường hợp này ít xảy ra nếu đã kiểm tra ở trên, nhưng vẫn là một lớp bảo vệ tốt
        throw new NotFoundException(
          `Material with ID "${materialId}" could not be deleted as it was not found.`,
        );
      }

      return deletedMaterial;
    } catch (err) {
      // Bắt lỗi từ Cloudinary hoặc MongoDB và báo lỗi chung
      throw new InternalServerErrorException(
        err.message || 'Failed to delete material due to an unexpected error.',
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
