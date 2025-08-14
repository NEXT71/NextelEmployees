import express from 'express';
const router = express.Router();
import { 
  register,
  registerEmployee, 
  login, 
  getMe, 
  logout,
  verifyEmployeeAccount,
  sendOTPForVerification,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify/otp', sendOTPForVerification);
router.post('/verify/employee', verifyEmployeeAccount);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);

// Protected routes
router.post('/register/employee', auth, admin, registerEmployee);
router.get('/me', auth, getMe);
router.post('/logout', auth, logout);

export default router;