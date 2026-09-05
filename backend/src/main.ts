import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

// Apply a global transform to mongoose to map _id to id
import mongoose from 'mongoose';
mongoose.set('toJSON', {
  virtuals: true,
  transform: (doc, converted) => {
    delete (converted as any)._id;
    delete (converted as any).__v;
  }
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(8080);
}
bootstrap();
