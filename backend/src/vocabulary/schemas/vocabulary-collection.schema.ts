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

  /** Present while the collection is publicly shared; the link is the only access control. */
  @Prop()
  shareId?: string;
}

export const VocabularyCollectionSchema = SchemaFactory.createForClass(VocabularyCollection);
VocabularyCollectionSchema.index({ userId: 1, wordIds: 1 });
VocabularyCollectionSchema.index({ shareId: 1 }, { unique: true, sparse: true });
// Guarantees a single Inbox per user even when requests race.
VocabularyCollectionSchema.index(
  { userId: 1, name: 1 },
  { unique: true, partialFilterExpression: { name: 'Inbox' } },
);
