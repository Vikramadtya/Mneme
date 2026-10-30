import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
class PushSubscription {
  @Prop({ required: true }) endpoint: string;
  @Prop({ type: Object, required: true }) keys: { p256dh: string; auth: string };
}
const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscription);

@Schema({ collection: 'user_settings', timestamps: true })
export class UserSettings {
  @Prop({ required: true }) userId: string;
  /** Reviews per day the user aims for. */
  @Prop({ default: 20 }) dailyGoal: number;
  /** Local hour (0-23) to send the daily reminder; null means reminders are off. */
  @Prop({ type: Number, default: null }) reminderHour: number | null;
  @Prop({ default: 'UTC' }) timezone: string;
  /** Local date (YYYY-MM-DD) of the last reminder, so it goes out at most once a day. */
  @Prop() lastReminderOn: string;
  @Prop({ type: [PushSubscriptionSchema], default: [] }) pushSubscriptions: PushSubscription[];
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
UserSettingsSchema.index({ userId: 1 }, { unique: true });
UserSettingsSchema.index({ reminderHour: 1 });
