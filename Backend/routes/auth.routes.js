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
import hr from '../middlewares/hr.js';

router.post('/login', login);

// Protected routes
router.post('/register/employee', auth, hr, registerEmployee);
router.get('/me', auth, getMe);
router.get('/employees/stats', auth, hr, getEmployeeStats);
router.post('/logout', auth, logout);

export default router;