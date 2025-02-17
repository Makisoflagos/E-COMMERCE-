import mongoose, { Schema, Document } from 'mongoose';

export interface ISubcategory extends Document {
    name: string;
    store: mongoose.Types.ObjectId;
  }
  
  const SubcategorySchema = new Schema<ISubcategory>(
    {
      name: { type: String, required: true },
      store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    },
    { timestamps: true }
  );
  
  export default mongoose.model<ISubcategory>('Subcategory', SubcategorySchema);