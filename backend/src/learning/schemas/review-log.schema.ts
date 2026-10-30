import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'review_logs', timestamps: { createdAt: 'reviewedAt', updatedAt: false } })
export class ReviewLog {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) wordId: string;
  @Prop({ required: true }) grade: number;
  /** Scheduling state before this review, so it can be undone. */
  @Prop({ type: Object }) before: Record<string, any>;
  /** How the card was answered: flip, typed, cloze or reverse. */
  @Prop() mode: string;

  reviewedAt?: Date;
}

export const ReviewLogSchema = SchemaFactory.createForClass(ReviewLog);
ReviewLogSchema.index({ userId: 1, reviewedAt: -1 });
ReviewLogSchema.index({ userId: 1, wordId: 1 });
