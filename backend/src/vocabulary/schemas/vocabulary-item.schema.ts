import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

const MeaningSchema = new MongooseSchema(
  {
    partOfSpeech: String,
    definitions: [
      { _id: false, definition: String, example: String, synonyms: [String], antonyms: [String] },
    ],
    synonyms: [String],
    antonyms: [String],
  },
  { _id: false },
);

@Schema({ collection: 'vocabulary', timestamps: true })
export class VocabularyItem {
  @Prop({ required: true })
  word: string;

  @Prop({ type: [MeaningSchema] })
  meanings: any[];

  @Prop() pronunciation: string;
  @Prop() audioUrl: string;
  @Prop() origin: string;
  @Prop() notes: string;
  @Prop([String]) definitions: string[];
  @Prop([String]) examples: string[];
  @Prop([String]) synonyms: string[];
  @Prop([String]) antonyms: string[];
  @Prop() difficulty: string;
  @Prop([String]) topics: string[];
  @Prop([String]) relatedWords: string[];

  @Prop({ required: true })
  createdBy: string;

  createdAt?: Date;
}

export const VocabularyItemSchema = SchemaFactory.createForClass(VocabularyItem);
VocabularyItemSchema.index({ createdBy: 1, createdAt: -1 });
