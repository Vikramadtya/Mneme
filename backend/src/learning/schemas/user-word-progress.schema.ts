import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'user_word_progress', timestamps: true })
export class UserWordProgress {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) wordId: string;
  @Prop({ default: 'NEW' }) state: string;
  /** FSRS difficulty (1-10); records without `algo` hold the old SM-2 easiness factor. */
  @Prop({ default: 2.5 }) difficulty: number;
  /** FSRS stability in days; for old SM-2 records, the interval. */
  @Prop({ default: 0 }) stability: number;
  @Prop({ default: 0 }) lapses: number;
  @Prop() algo: string;
  @Prop({ default: 0 }) reviewCount: number;
  @Prop({ default: 0 }) successCount: number;
  @Prop({ default: 0 }) failureCount: number;
  @Prop() lastReviewedAt: Date;
  @Prop({ default: () => new Date() }) nextReviewAt: Date;
}

export const UserWordProgressSchema = SchemaFactory.createForClass(UserWordProgress);
UserWordProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true });
UserWordProgressSchema.index({ userId: 1, nextReviewAt: 1 });
