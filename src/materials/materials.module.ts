import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Material, MaterialSchema } from './schema/materials.schema';
import { CloudinaryModule } from '@/cloudinary/cloudinary.module';
import {
  Registration,
  RegistrationSchema,
} from '@/matching/schema/registration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
      { name: Registration.name, schema: RegistrationSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MongooseModule],
})
export class MaterialsModule {}
