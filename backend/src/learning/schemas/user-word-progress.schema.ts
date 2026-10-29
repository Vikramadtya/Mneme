import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'user_word_progress', timestamps: true })
export class UserWordProgress {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) wordId: string;
  @Prop({ default: 'NEW' }) state: string;
  /** SM-2 easiness factor. */
  @Prop({ default: 2.5 }) difficulty: number;
  /** SM-2 interval in days. */
  @Prop({ default: 0 }) stability: number;
  @Prop({ default: 0 }) reviewCount: number;
  @Prop({ default: 0 }) successCount: number;
  @Prop({ default: 0 }) failureCount: number;
  @Prop() lastReviewedAt: Date;
  @Prop({ default: () => new Date() }) nextReviewAt: Date;
}

export const UserWordProgressSchema = SchemaFactory.createForClass(UserWordProgress);
UserWordProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true });
UserWordProgressSchema.index({ userId: 1, nextReviewAt: 1 });
