import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  otp: string | null;
  otpExpires: Date | null;
  isVerified: boolean;
  isActive: boolean; 
  role?: string;
  comparePassword: (password: string) => Promise<boolean>;
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: String, default: null},
  otpExpires: { type: Date, default: null},
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  role: {type: String, enum: ["user", "admin"], default: "user"},
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password: string) {
  return bcrypt.compare(password, this.password);
};



export default mongoose.model<IUser>('User', userSchema);