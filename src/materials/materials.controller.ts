import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile, // 👈 1. Import
  UseInterceptors, // 👈 2. Import
  BadRequestException,
  Req,
  UseGuards,
  Delete, // Optional: Để validate file
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-materials.dto';
import { UpdateMaterialDto } from './dto/update-materials.dto';
import { FileInterceptor } from '@nestjs/platform-express'; // 👈 3. Import
import { Request } from 'express';
import { AuthRequest } from '@/matching/matching.controller';
import { JwtAuthGuard } from '@/auth/jwt/jwt-auth.guard';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async getAll() {
    return this.materialsService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.materialsService.getById(id);
  }

  // 👇 4. Cập nhật Route 'create'
  @UseGuards(JwtAuthGuard)
  @Post('create')
  @UseInterceptors(FileInterceptor('pdfFile')) // Tên 'pdfFile' phải trùng với tên field trong FormData của FE
  async createMaterials(
    @Body() createMaterialDto: CreateMaterialDto,
    @UploadedFile() file: Express.Multer.File, // Lấy file từ request
    @Req() req: AuthRequest,
  ) {
    // Validate: Bắt buộc phải có file PDF
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('A PDF file is required.');
    }
    const userId = req.user.userId;
    // Gọi service và truyền cả DTO và file vào
    return this.materialsService.createMaterials(
      createMaterialDto,
      file,
      userId,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) // Bảo vệ route
  async deleteMaterial(@Param('id') materialId: string) {
    return this.materialsService.deleteMaterial(materialId);
  }

  @Post('update/:id')
  async updateMaterial(
    @Body() updateMaterialDto: UpdateMaterialDto,
    @Param('id') id: string,
  ) {
    return this.materialsService.updateMaterial(updateMaterialDto, id);
  }
}
