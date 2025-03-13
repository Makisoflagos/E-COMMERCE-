import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import User from '../models/userModel';
import Redis from 'ioredis';

config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
}).on('error', console.error);

// Extend the Express Request interface to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`token:blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token is no longer valid' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
    };
    
    // Check if user exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }
    
    // Add user info to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    next(error);
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // authenticate middleware should be called before this
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};