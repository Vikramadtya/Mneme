import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'review_logs', timestamps: { createdAt: 'reviewedAt', updatedAt: false } })
export class ReviewLog {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) wordId: string;
  @Prop({ required: true }) grade: number;

  reviewedAt?: Date;
}

export const ReviewLogSchema = SchemaFactory.createForClass(ReviewLog);
ReviewLogSchema.index({ userId: 1, reviewedAt: -1 });
ReviewLogSchema.index({ userId: 1, wordId: 1 });
