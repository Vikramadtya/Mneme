import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VocabularyItem } from './schemas/vocabulary-item.schema.js';
import { VocabularyCollection } from './schemas/vocabulary-collection.schema.js';
import { DictionaryService } from './dictionary.service.js';

@Controller('api/v1/vocabulary')
export class VocabularyController {
  constructor(
    @InjectModel(VocabularyItem.name) private vocabModel: Model<VocabularyItem>,
    @InjectModel(VocabularyCollection.name) private collectionModel: Model<VocabularyCollection>,
    @InjectModel('UserWordProgress') private progressModel: Model<any>,
    private dictionaryService: DictionaryService
  ) {}

  private getUserId(headers: any): string {
    return headers['x-user-id'] || '0000-0000-0000-0000';
  }

  @Get('me')
  async getMyVocabulary(@Headers() headers: any) {
    return this.vocabModel.find().exec();
  }

  @Get(':id')
  async getWord(@Param('id') id: string) {
    return this.vocabModel.findById(id).exec();
  }

  @Post()
  async addWord(@Body() body: any, @Query('collectionId') collectionId: string, @Headers() headers: any) {
    const userId = this.getUserId(headers);
    let item = { ...body, createdBy: userId };
    item = await this.dictionaryService.fetchWordDetails(item);
    
    if (!item.definitions || item.definitions.length === 0) {
      item.definitions = ["No definition available."];
    }

    // BUG FIX: Headless Word Fix using Mongoose Transactions
    const session = await this.vocabModel.db.startSession();
    session.startTransaction();
    
    try {
      const savedItem = new this.vocabModel(item);
      await savedItem.save({ session });
      
      const progress = new this.progressModel({
        userId,
        wordId: savedItem._id.toString(),
        state: 'NEW',
        difficulty: 5.0,
        stability: 0.0,
        nextReviewAt: new Date(),
        reviewCount: 0,
        successCount: 0,
        failureCount: 0
      });
      await progress.save({ session });
      
      let targetCollection = collectionId ? 
        await this.collectionModel.findById(collectionId).session(session) : 
        await this.collectionModel.findOne({ userId, name: { $regex: /^Inbox$/i } }).session(session);
        
      if (!targetCollection && !collectionId) {
        targetCollection = new this.collectionModel({ name: 'Inbox', userId, wordIds: [] });
      }
      
      if (targetCollection) {
        if (!targetCollection.wordIds) targetCollection.wordIds = [];
        targetCollection.wordIds.push(savedItem._id.toString());
        await targetCollection.save({ session });
      }
      
      await session.commitTransaction();
      return savedItem;
    } catch (error: any) {
      await session.abortTransaction();
      throw new HttpException('Failed to save word and progress atomically: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      session.endSession();
    }
  }

  @Put(':id')
  async updateWord(@Param('id') id: string, @Body() body: any) {
    return this.vocabModel.findByIdAndUpdate(id, body, { new: true }).exec();
  }

  @Delete(':id')
  async deleteWord(@Param('id') id: string) {
    // The pre('findOneAndDelete') hook on VocabularyItemSchema will cascade delete the progress!
    await this.vocabModel.findOneAndDelete({ _id: id }).exec();
    return { success: true };
  }
}
