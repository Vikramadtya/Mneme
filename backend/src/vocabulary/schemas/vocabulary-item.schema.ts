import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'vocabulary', timestamps: true })
export class VocabularyItem extends Document {
  @Prop({ required: true })
  word: string;

  @Prop({ type: [{ partOfSpeech: String, definitions: [{ definition: String, example: String, synonyms: [String], antonyms: [String] }] }] })
  meanings: any[];

  @Prop()
  pronunciation: string;

  @Prop()
  audioUrl: string;

  @Prop()
  origin: string;

  @Prop()
  notes: string;

  @Prop([String])
  definitions: string[];

  @Prop([String])
  examples: string[];

  @Prop([String])
  synonyms: string[];

  @Prop([String])
  antonyms: string[];

  @Prop()
  difficulty: string;

  @Prop([String])
  topics: string[];

  @Prop([String])
  relatedWords: string[];

  @Prop()
  createdBy: string;
}

export const VocabularyItemSchema = SchemaFactory.createForClass(VocabularyItem);

// BUG FIX: Prevent Orphaned Progress Trackers
// When a VocabularyItem is deleted, automatically cascade and delete its associated UserWordProgress
VocabularyItemSchema.pre('findOneAndDelete', async function () {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    // Access the Mongoose connection to delete from other collections
    await docToUpdate.db.collection('user_word_progress').deleteMany({ wordId: docToUpdate._id.toString() });
    await docToUpdate.db.collection('review_logs').deleteMany({ wordId: docToUpdate._id.toString() });
    
    // Also remove this wordId from any collections it belongs to
    await docToUpdate.db.collection('collections').updateMany(
      { wordIds: docToUpdate._id.toString() },
      { $pull: { wordIds: docToUpdate._id.toString() } }
    );
  }
  
});
