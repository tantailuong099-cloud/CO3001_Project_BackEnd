import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  // 1. Dòng này giúp đọc cookie đăng nhập (QUAN TRỌNG)
  app.use(cookieParser());

  // 2. Dòng này thêm chữ '/api' vào trước mọi đường dẫn backend
  // Giúp khớp với Frontend đang gọi '/api/auth/login'
  app.setGlobalPrefix('api'); 

  // 3. Cấu hình CORS (như bạn đã làm đúng)
  app.enableCors({
    origin: true, // Hoặc cụ thể 'http://localhost:3000'
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Cho phép gửi/nhận cookie
  });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();