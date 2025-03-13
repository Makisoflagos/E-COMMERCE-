import { Request, Response, NextFunction } from 'express';
import * as UserService from '../services/userService';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;
    const response = await UserService.register(name, email, password);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

export async function verifyOTP(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, otp } = req.body;
    const response = await UserService.verifyOTP(email, otp);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export async function resendOTP(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const response = await UserService.resendOTP(email);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const response = await UserService.login(email, password);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const response = await UserService.forgotPassword(email);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    const response = await UserService.resetPassword(token, newPassword);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      
      const result = await UserService.getAllUsers(page, limit, search);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
  export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;
      const user = await UserService.getUserById(userId);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };
  export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      
      const userId = req.user.id;
      const user = await UserService.getUserProfile(userId);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };
  export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      const updatedUser = await UserService.updateUserProfile(userId, updateData);
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  };
  export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      const result = await UserService.changePassword(userId, currentPassword, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
  export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const result = await UserService.deleteUser(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

//   ADMIN ENDPOINTS
  // Admin - Get user by ID
export const adminGetUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;
      const user = await UserService.getUserById(userId);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };
  
  // Admin - Update user
  export const adminUpdateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      const updatedUser = await UserService.updateUserProfile(userId, updateData);
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  };
  
  // Admin - Delete user
  export const adminDeleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;
      const result = await UserService.deleteUser(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
  
  // Admin - Update user status (activate/deactivate)
  export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;
      const { isActive } = req.body;
      const user = await UserService.updateUserStatus(userId, isActive);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };