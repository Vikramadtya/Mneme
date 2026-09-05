import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'user_word_progress', timestamps: true })
export class UserWordProgress extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  wordId: string;

  @Prop({ default: 'NEW' })
  state: string;

  @Prop({ default: 5.0 })
  difficulty: number;

  @Prop({ default: 0.0 })
  stability: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  failureCount: number;

  @Prop()
  lastReviewedAt: Date;

  @Prop({ default: () => new Date() })
  nextReviewAt: Date;
}

export const UserWordProgressSchema = SchemaFactory.createForClass(UserWordProgress);

// BUG FIX: Prevent Duplicate Progress Trackers
// This unique compound index ensures that a user can only ever have ONE progress tracker per word.
UserWordProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true });
