import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'review_logs', timestamps: { createdAt: 'reviewedAt', updatedAt: false } })
export class ReviewLog extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  wordId: string;

  @Prop({ required: true })
  grade: number;

  reviewedAt?: Date;
}

export const ReviewLogSchema = SchemaFactory.createForClass(ReviewLog);
