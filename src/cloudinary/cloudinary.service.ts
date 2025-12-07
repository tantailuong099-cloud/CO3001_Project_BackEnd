// src/cloudinary/cloudinary.service.ts

import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import * as path from 'path';

@Injectable()
export class CloudinaryService {
  uploadFile(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      let resourceType: 'image' | 'video' | 'raw' = 'raw'; // Mặc định là raw

      // 👇 SỬA LẠI LOGIC Ở ĐÂY
      // Nếu là ảnh HOẶC là file PDF, hãy coi nó là 'image'
      if (
        file.mimetype.startsWith('image/') ||
        file.mimetype === 'application/pdf'
      ) {
        resourceType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
      }
      // Các loại file khác (zip, docx...) sẽ vẫn là 'raw'

      const fileExtension = path.extname(file.originalname).substring(1);

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'nestjs_uploads',
          // resource_type bây giờ sẽ là 'image' cho file PDF
          resource_type: resourceType,
          // format vẫn cần để đảm bảo đuôi file đúng
          format: fileExtension,
          // type: 'upload' giờ là mặc định cho image, nhưng để đây cho rõ ràng
          type: 'upload',
        },
        (error, result) => {
          if (error) return reject(new Error(error.message || 'Upload failed'));
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
