import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'users', timestamps: true })
export class User extends Document {
  @Prop({ unique: true })
  googleSubjectId: string;

  @Prop()
  email: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
