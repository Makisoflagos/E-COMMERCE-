import User, { IUser } from '../models/userModel';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import crypto from 'crypto';
import Redis from 'ioredis';
import { AuthError } from '../utils/errors/AuthError';
import mongoose from 'mongoose';

config()
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
}).on('error', console.error);

const transporter = nodemailer.createTransport({

  service: 'gmail',
  auth: {
  
  user: process.env.EMAIL_USER,
  
  pass: process.env.EMAIL_PASS,
  
  },
  
  });

export class UserError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
      super(message);
      this.name = 'UserError';
      this.statusCode = statusCode;
  }
}

// Constants
const OTP_EXPIRY_MINUTES = 5;
const JWT_EXPIRY_DAYS = '7d';
const REDIS_KEY_PREFIXES = {
  TOKEN_BLACKLIST: 'token:blacklist:',
};

// Utility Functions
export async function generateOTP(): Promise<string> {
  return (100000 + Math.floor(crypto.randomBytes(4).readUInt32BE(0) % 900000)).toString();
}

export async function sendOTP(email: string, otp: string): Promise<void> {
  const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Account Verification Code',
      html: `<p>Your verification code is: <strong>${otp}</strong>. It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  };

  try {
      await transporter.sendMail(mailOptions);
  } catch (error) {
      console.error('Error sending OTP email:', error); // Log the error
      throw new AuthError('Failed to send verification email', 500);
  }
}

// Authentication Services
export async function register(name: string, email: string, password: string) {
  if (!name || !email || !password) {
      throw new AuthError('All fields are required');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
      throw new AuthError('Email already registered');
  }

  const otp = await generateOTP();
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const newUser = new User({ name, email, password, otp, otpExpires });
  await newUser.save();

  await sendOTP(email, otp);

  return { message: 'Registration successful. Check your email for the OTP.', email };
}

export async function verifyOTP(email: string, otp: string) {
  const user = await User.findOne({ email });
  if (!user) {
      throw new AuthError('User not found');
  }

  if (user.isVerified) {
      throw new AuthError('Account already verified');
  }

  if (!user.otp || !user.otpExpires || new Date(user.otpExpires).getTime() < Date.now()) {
      throw new AuthError('Verification code has expired');
  }

  if (user.otp !== otp) {
      throw new AuthError('Invalid verification code');
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  return { message: 'Account verified successfully' };
}

export async function resendOTP(email: string) {
  const user = await User.findOne({ email });
  if (!user) {
      throw new AuthError('User not found');
  }

  if (user.isVerified) {
      throw new AuthError('Account already verified');
  }

  const otp = await generateOTP();
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();

  await sendOTP(email, otp);

  return { message: 'New OTP sent', email };
}

export async function login(email: string, password: string) {
  if (!email || !password) {
      throw new AuthError('Email and password are required');
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
      throw new AuthError('Invalid credentials');
  }

  if (!user.isVerified) {
      throw new AuthError('Please verify your email before logging in');
  }

  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: JWT_EXPIRY_DAYS });

  return { token, user: { id: user._id.toString(), name: user.name, email: user.email, isVerified: user.isVerified } };
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email });
  if (!user) {
      throw new AuthError('User not found');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Store the reset token in Redis with an expiration
  const redisKey = `${REDIS_KEY_PREFIXES.TOKEN_BLACKLIST}${hashedToken}`;
  await redis.setex(redisKey, 15 * 60, email); // 15 minutes

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 15 minutes.</p>`,
  };

  try {
      await transporter.sendMail(mailOptions);
  } catch (error) {
      console.error('Error sending reset email:', error);
      throw new AuthError('Failed to send password reset email', 500);
  }

  return { message: 'Password reset email sent. Check your inbox.' };
}

export async function resetPassword(token: string, newPassword: string) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const redisKey = `${REDIS_KEY_PREFIXES.TOKEN_BLACKLIST}${hashedToken}`;
  const email = await redis.get(redisKey);

  if (!email) {
      throw new AuthError('Invalid or expired token');
  }

  const user = await User.findOne({ email });
  if (!user) {
      throw new AuthError('User not found');
  }

  user.password = newPassword;
  await user.save();

  await redis.del(redisKey); // Remove the token from Redis

  return { message: 'Password reset successfully' };
}

// User Management Services
export async function getAllUsers(page = 1, limit = 10, search = '') {
  const skip = (page - 1) * limit;

  const query = search
      ? {
          $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
          ],
      }
      : {};

  try {
      const users = await User.find(query)
          .select('-password -otp -otpExpires')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(); // Use lean() for faster reads

      const total = await User.countDocuments(query);

      return {
          users,
          pagination: {
              total,
              page,
              limit,
              pages: Math.ceil(total / limit),
          },
      };
  } catch (error) {
      console.error('Error getting all users:', error);
      throw new UserError('Error fetching users', 500);
  }
}

export async function getUserById(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UserError('Invalid user ID');
  }

  try {
      const user = await User.findById(userId).select('-password -otp -otpExpires').lean();
      if (!user) {
          throw new UserError('User not found', 404);
      }
      return user;
  } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new UserError('Error fetching user', 500);
  }
}

export async function getUserProfile(userId: string) {
  return getUserById(userId); // Reuse getUserById for profile
}

export async function updateUserProfile(userId: string, updateData: Partial<IUser>) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UserError('Invalid user ID');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, isVerified, otp, otpExpires, ...safeUpdates } = updateData;

  if (safeUpdates.email) {
      const emailExists = await User.exists({
          email: safeUpdates.email,
          _id: { $ne: userId },
      });

      if (emailExists) {
          throw new UserError('Email already in use');
      }
  }

  try {
      const user = await User.findByIdAndUpdate(
          userId,
          { $set: safeUpdates },
          { new: true }
      ).select('-password -otp -otpExpires').lean();

      if (!user) {
          throw new UserError('User not found', 404);
      }

      return user;
  } catch (error) {
      console.error('Error updating user profile:', error);
      throw new UserError('Error updating user', 500);
  }
}

export async function deleteUser(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UserError('Invalid user ID');
  }

  try {
      const user = await User.findByIdAndDelete(userId).lean();
      if (!user) {
          throw new UserError('User not found', 404);
      }

      return { message: 'User account deleted successfully' };
  } catch (error) {
      console.error('Error deleting user:', error);
      throw new UserError('Error deleting user', 500);
  }
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UserError('Invalid user ID');
  }

  try {
      const user = await User.findByIdAndUpdate(
          userId,
          { $set: { isActive } },
          { new: true }
      ).select('-password -otp -otpExpires').lean();

      if (!user) {
          throw new UserError('User not found', 404);
      }

      return user;
  } catch (error) {
      console.error('Error updating user status:', error);
      throw new UserError('Error updating user', 500);
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UserError('Invalid user ID');
  }

  try {
      const user = await User.findById(userId);
      if (!user) {
          throw new UserError('User not found', 404);
      }

      const isPasswordCorrect = await user.comparePassword(currentPassword);
      if (!isPasswordCorrect) {
          throw new UserError('Current password is incorrect', 401);
      }

      user.password = newPassword;
      await user.save();

      return { message: 'Password changed successfully' };
  } catch (error) {
      console.error('Error changing password:', error);
      throw new UserError('Error changing password', 500);
  }
}