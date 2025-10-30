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

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name) private materialModel: Model<MaterialDocument>,
  ) {}

  async createMaterials(createMaterialsDto: CreateMaterialDto) {
    const newMetarials = new this.materialModel(createMaterialsDto);
    return newMetarials.save();
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
