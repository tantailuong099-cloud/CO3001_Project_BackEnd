import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-materials.dto';
import { UpdateMaterialDto } from './dto/update-materials.dto';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async getAll() {
    return this.materialsService.getAll();
  }

  @Post('create')
  async createMaterials(@Body() createMaterialsDto: CreateMaterialDto) {
    return this.materialsService.createMaterials(createMaterialsDto);
  }

  @Post('update/:id')
  async updateMaterial(
    @Body() updateMaterialDto: UpdateMaterialDto,
    @Param('id') id: string,
  ) {
    return this.materialsService.updateMaterial(updateMaterialDto, id);
  }
}
