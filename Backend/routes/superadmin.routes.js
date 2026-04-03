import express from 'express';
import auth from '../middlewares/auth.js';
import superadmin from '../middlewares/superadmin.js';
import {
  getAllUsers,
  toggleUserActive,
  getAllEmployees,
  getEmployeeFullHistory,
  getAllSalesSubmissions,
  getSalesLeaderboard,
  getAllSalaries,
  getSuperAdminStats
} from '../controllers/superadmin.controller.js';

const router = express.Router();

// All superadmin routes require authentication + superadmin role
router.use(auth, superadmin);

router.get('/stats',            getSuperAdminStats);
router.get('/users',            getAllUsers);
router.patch('/users/:id/toggle-active', toggleUserActive);
router.get('/employees',        getAllEmployees);
router.get('/employees/:id/full-history', getEmployeeFullHistory);
router.get('/sales',            getAllSalesSubmissions);
router.get('/sales/leaderboard', getSalesLeaderboard);
router.get('/salaries',         getAllSalaries);

export default router;
