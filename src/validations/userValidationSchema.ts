import Joi from 'joi';

export const userSchema = {
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    phone: Joi.string().allow(''),
  }).min(1), 

  // Schema for changing password
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required().min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).message('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  }),

  // Admin update user schema (more fields allowed)
  adminUpdateUser: Joi.object({
    name: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    phone: Joi.string().allow(''),
    role: Joi.string().valid('user', 'admin', 'moderator'),
  }).min(1),
  updateStatus: Joi.object({
    isActive: Joi.boolean().required()
  })
};