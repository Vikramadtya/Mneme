import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'collections', timestamps: true })
export class VocabularyCollection {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ type: [String], default: [] })
  wordIds: string[];
}

export const VocabularyCollectionSchema = SchemaFactory.createForClass(VocabularyCollection);
VocabularyCollectionSchema.index({ userId: 1, wordIds: 1 });
// Guarantees a single Inbox per user even when requests race.
VocabularyCollectionSchema.index(
  { userId: 1, name: 1 },
  { unique: true, partialFilterExpression: { name: 'Inbox' } },
);
