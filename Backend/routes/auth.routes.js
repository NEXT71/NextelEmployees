import express from 'express';
const router = express.Router();
import { 
  registerEmployee, 
  login, 
  getMe, 
  logout,
  getEmployeeStats,
} from '../controllers/auth.controller.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';

router.post('/login', login);

// Protected routes
router.post('/register/employee', auth, admin, registerEmployee);
router.get('/me', auth, getMe);
router.get('/employees/stats', auth, admin, getEmployeeStats);
router.post('/logout', auth, logout);

export default router;