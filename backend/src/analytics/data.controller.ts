import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Controller('api/v1/data')
export class DataController {
  constructor(
    @InjectModel('VocabularyItem') private vocabModel: Model<any>,
    @InjectModel('UserWordProgress') private progressModel: Model<any>,
    @InjectModel('VocabularyCollection') private collectionModel: Model<any>,
    @InjectModel('ReviewLog') private logModel: Model<any>,
  ) {}

  private getUserId(headers: any): string {
    const auth = headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.split(' ')[1];
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payloadBuffer = Buffer.from(payloadBase64, 'base64');
          const payload = JSON.parse(payloadBuffer.toString('utf8'));
          if (payload && payload.sub) {
            return payload.sub; // Google User ID
          }
        }
      } catch (e: any) {}
    }
    return headers['x-user-id'] || '0000-0000-0000-0000';
  }

  @Get('export')
  async exportData(@Headers() headers: any) {
    const userId = this.getUserId(headers);
    const [vocabulary, collections, progress, logs] = await Promise.all([
      this.vocabModel.find({ createdBy: userId }).exec(),
      this.collectionModel.find({ userId }).exec(),
      this.progressModel.find({ userId }).exec(),
      this.logModel.find({ userId }).exec()
    ]);
    
    return {
      version: 1,
      timestamp: new Date().toISOString(),
      data: { vocabulary, collections, progress, logs }
    };
  }

  @Post('import')
  async importData(@Body() body: any, @Headers() headers: any) {
    const userId = this.getUserId(headers);
    if (!body || !body.data || body.version !== 1) {
      throw new HttpException('Invalid backup file format', HttpStatus.BAD_REQUEST);
    }

    const { vocabulary, collections, progress, logs } = body.data;

    // Optional: Wipe existing data
    await Promise.all([
      this.vocabModel.deleteMany({ createdBy: userId }),
      this.collectionModel.deleteMany({ userId }),
      this.progressModel.deleteMany({ userId }),
      this.logModel.deleteMany({ userId })
    ]);

    // We must map old _ids to new ObjectIds, or keep the original strings if MongoDB allows them
    // MongoDB allows custom string _ids if schema allows, but default is ObjectId.
    // To be safe, we will just insert them without their _id field, but wait, collections reference wordIds!
    // And progress references wordIds! 
    // We must preserve the exact _id strings from the backup.
    
    const insertDocs = async (model: Model<any>, docs: any[]) => {
      if (!docs || docs.length === 0) return;
      const mapped = docs.map(d => {
        const doc = { ...d };
        if (doc.id) {
           doc._id = doc.id;
           delete doc.id;
        }
        return doc;
      });
      await model.insertMany(mapped);
    };

    try {
        await insertDocs(this.vocabModel, vocabulary);
        await insertDocs(this.collectionModel, collections);
        await insertDocs(this.progressModel, progress);
        await insertDocs(this.logModel, logs);
    } catch (e: any) {
        throw new HttpException('Failed to insert backup: ' + e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    return { success: true };
  }
}
