import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { UserId } from '../auth/user.decorator.js';
import { Controller, Get, Post, Put, Delete, Body, Param, Headers } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VocabularyCollection } from './schemas/vocabulary-collection.schema.js';

@Controller('api/v1/collections')
@UseGuards(AuthGuard)
export class CollectionController {
  constructor(
    @InjectModel(VocabularyCollection.name) private collectionModel: Model<VocabularyCollection>
  ) {}



  @Get()
  async getCollections(@UserId() userId: string) {
    return this.collectionModel.find({ userId: userId }).exec();
  }

  @Post()
  async createCollection(@Body() body: any, @UserId() userId: string) {
    const doc = new this.collectionModel({ ...body, userId: userId });
    return doc.save();
  }

  @Put(':id')
  async updateCollection(@Param('id') id: string, @Body() body: any) {
    return this.collectionModel.findByIdAndUpdate(id, body, { new: true }).exec();
  }

  @Put(':id/words')
  async updateWords(@Param('id') id: string, @Body() body: { wordIds: string[] }) {
    return this.collectionModel.findByIdAndUpdate(id, { wordIds: body.wordIds }, { new: true }).exec();
  }

  @Delete(':id')
  async deleteCollection(@Param('id') id: string) {
    await this.collectionModel.findByIdAndDelete(id).exec();
    return { success: true };
  }
}
