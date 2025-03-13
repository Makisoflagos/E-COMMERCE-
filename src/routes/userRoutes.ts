import express, { Router } from 'express';
import * as UserController from '../controllers/userController';
import * as AuthMiddleware from '../middleware/authMiddleware';

const router: Router = express.Router();

// User Authentication Routes
router.post('/register', UserController.register);
router.post('/verify-otp', UserController.verifyOTP);
router.post('/resend-otp', UserController.resendOTP);
router.post('/login', UserController.login);
router.post('/forgot-password', UserController.forgotPassword);
router.post('/reset-password', UserController.resetPassword);

// User Profile Routes (Protected)
router.get('/profile', AuthMiddleware.authenticate, UserController.getUserProfile);
router.put('/profile', AuthMiddleware.authenticate, UserController.updateUserProfile);
router.put('/change-password', AuthMiddleware.authenticate, UserController.changePassword);
router.delete('/delete-account', AuthMiddleware.authenticate, UserController.deleteUser);

// User Management Routes (Admin Only)
router.get('/users', AuthMiddleware.authenticate, AuthMiddleware.isAdmin, UserController.getAllUsers);
router.get('/users/:id', AuthMiddleware.authenticate, AuthMiddleware.isAdmin, UserController.adminGetUser);
router.put('/users/:id', AuthMiddleware.authenticate, AuthMiddleware.isAdmin, UserController.adminUpdateUser);
router.delete('/users/:id', AuthMiddleware.authenticate, AuthMiddleware.isAdmin, UserController.adminDeleteUser);
router.put('/users/:id/status', AuthMiddleware.authenticate, AuthMiddleware.isAdmin, UserController.updateUserStatus);

// Public User Routes
router.get('/user/:id', UserController.getUserById);

export default router;