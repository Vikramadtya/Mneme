import { Controller, Get, Post, Put, Delete, Body, Param, Headers } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VocabularyCollection } from './schemas/vocabulary-collection.schema.js';

@Controller('api/v1/collections')
export class CollectionController {
  constructor(
    @InjectModel(VocabularyCollection.name) private collectionModel: Model<VocabularyCollection>
  ) {}

  private getUserId(headers: any): string {
    return headers['x-user-id'] || '0000-0000-0000-0000';
  }

  @Get()
  async getCollections(@Headers() headers: any) {
    return this.collectionModel.find({ userId: this.getUserId(headers) }).exec();
  }

  @Post()
  async createCollection(@Body() body: any, @Headers() headers: any) {
    const doc = new this.collectionModel({ ...body, userId: this.getUserId(headers) });
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
