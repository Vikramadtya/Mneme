import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'collections', timestamps: true })
export class VocabularyCollection extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  userId: string;

  @Prop([String])
  wordIds: string[];
}

export const VocabularyCollectionSchema = SchemaFactory.createForClass(VocabularyCollection);
