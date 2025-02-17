import mongoose, { Schema, Document } from 'mongoose';

export interface IStore extends Document {
  name: string;
  description?: string;
  subcategories: mongoose.Types.ObjectId[];
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    subcategories: [{ type: Schema.Types.ObjectId, ref: 'Subcategory' }],
  },
  { timestamps: true }
);

export default mongoose.model<IStore>('Store', StoreSchema);