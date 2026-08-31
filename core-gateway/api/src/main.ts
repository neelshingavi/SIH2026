import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe, Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Phase 97: Graceful Shutdown
  app.enableShutdownHooks();
  
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Core Gateway running on port ${port}`);
}
bootstrap();
