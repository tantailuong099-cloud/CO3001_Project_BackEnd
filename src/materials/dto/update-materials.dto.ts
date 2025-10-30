import { CreateMaterialDto } from './create-materials.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
