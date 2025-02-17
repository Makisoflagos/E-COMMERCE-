import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    description: string;
    price: number;
    stock: number;
    store: mongoose.Types.ObjectId;
    subcategory: mongoose.Types.ObjectId;
    images: string[];
  }
  
  const ProductSchema = new Schema<IProduct>(
    {
      name: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true },
      stock: { type: Number, required: true },
      store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
      subcategory: { type: Schema.Types.ObjectId, ref: 'Subcategory', required: true },
      images: [{ type: String }],
    },
    { timestamps: true }
  );
  
  export default mongoose.model<IProduct>('Product', ProductSchema);
  