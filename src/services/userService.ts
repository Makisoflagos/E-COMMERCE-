import User, { IUser } from '../models/userModel';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import { createTransport, Transporter } from 'nodemailer';
import crypto from 'crypto';
import Redis from 'ioredis'

config();

class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    isVerified: boolean;
  };
}

interface OTPResponse {
  message: string;
  email: string;
}

class UserService {
  private transporter: Transporter;
  private redis: Redis;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly JWT_EXPIRY_DAYS = '7d';
  private readonly REDIS_KEY_PREFIXES = {
    USER: "user:",
    OTP: "otp:",
    TOKEN_BLACKLIST: 'token:blacklist:',
    RATE_LIMIT: 'rate:',
  }

  constructor() {
    this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,   
    }).on('error', console.error);

    this.transporter = createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    this.validateConfig();
  }

  private validateConfig() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration is incomplete');
    }
  }

  private generateOTP(): string {
    const min = 100000;
    const max = 999999;
    return (min + Math.floor(crypto.randomBytes(4).readUInt32BE(0) % (max - min + 1))).toString();
  }

  private async sendOTP(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Account Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Account</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 4px; color: #4a90e2;">${otp}</h1>
          <p>This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new AuthError('Failed to send verification email', 500);
    }
  }

  private generateToken(user: IUser): string {
    return jwt.sign(
      { 
        id: user._id, 
        email: user.email 
      },
      process.env.JWT_SECRET!,
      { expiresIn: this.JWT_EXPIRY_DAYS }
    );
  }

  async register(name: string, email: string, password: string): Promise<OTPResponse> {
    if (!name || !email || !password) {
      throw new AuthError('All fields are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AuthError('Invalid email format');
    }

  
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AuthError('Email already registered');
    }

    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    const newUser = new User({
      name,
      email,
      password,
      otp,
      otpExpires,
    });

    await newUser.save();
    await this.sendOTP(email, otp);

    return {
      message: 'Registration successful. Please check your email for verification code.',
      email: newUser.email,
    };
  }

  async verifyOTP(email: string, otp: string): Promise<{ message: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthError('User not found');
    }

    if (user.isVerified) {
      throw new AuthError('Account already verified');
    }

    if (!user.otp || !user.otpExpires) {
      throw new AuthError('No verification code found');
    }

    if (user.otpExpires < new Date()) {
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

  async resendOTP(email: string): Promise<OTPResponse> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthError('User not found');
    }

    if (user.isVerified) {
      throw new AuthError('Account already verified');
    }
    user.otp = this.generateOTP();
    user.otpExpires = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    await this.sendOTP(email, user.otp);

    return {
      message: 'New verification code sent',
      email: user.email,
    };
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    if (!email || !password) {
      throw new AuthError('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthError('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new AuthError('Please verify your email before logging in');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthError('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    };
  }
}

export default new UserService();