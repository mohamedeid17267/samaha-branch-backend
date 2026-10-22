import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable HTTP response compression (Gzip / Deflate)
  app.use(compression());

  // Enable Global Validation and Auto-transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip out properties not defined in DTOs
      transform: true, // Automatically transform payload payloads to matching DTO types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Enable CORS for frontend requests (allows localhost and any device on local network / LAN)
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
