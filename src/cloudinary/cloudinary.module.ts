import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryConfig } from './cloudinary.config';

@Global()
@Module({
  providers: [
    CloudinaryService,
    {
      provide: 'CLOUDINARY',
      inject: [ConfigService],
      useFactory: CloudinaryConfig,
    },
  ],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
