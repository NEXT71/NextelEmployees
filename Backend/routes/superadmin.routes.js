import express from 'express';
import auth from '../middlewares/auth.js';
import superadmin from '../middlewares/superadmin.js';
import {
  getAllUsers,
  toggleUserActive,
  getAllEmployees,
  getEmployeeFullHistory,
  getAllSalesSubmissions,
  updateSale,
  getSalesLeaderboard,
  getCloserLeaderboard,
  getAllSalaries,
  updateSalary,
  getSuperAdminStats,
  deleteSale,
  deleteSalary,
  deleteEmployee,
  bulkDeleteSales,
  bulkDeleteSalaries,
  bulkDeleteEmployees,
  getAllFines,
  approveFine,
  deleteFine,
  getAllAttendance,
  updateAttendance,
  getAllMessages,
  respondToMessage,
  resolveMessage,
  getAuditLogs,
  getAuditLogById,
} from '../controllers/superadmin.controller.js';
import {
  createUserAccount,
  changeUserRole,
  resetUserPassword,
  getUserSessions,
  forceLogoutUser,
  unbindUserDevice,
  previewRestore,
  restoreFromAudit,
  getSettings,
  updateFineAmounts,
} from '../controllers/superadminAccounts.controller.js';

const router = express.Router();

// All superadmin routes require authentication + superadmin role
router.use(auth, superadmin);

router.get('/stats',            getSuperAdminStats);
router.get('/users',            getAllUsers);
router.get('/users/sessions', getUserSessions);
router.post('/users', createUserAccount);
router.patch('/users/:id/role', changeUserRole);
router.post('/users/:id/reset-password', resetUserPassword);
router.post('/users/:id/force-logout', forceLogoutUser);
router.post('/users/:id/unbind-device', unbindUserDevice);
router.patch('/users/:id/toggle-active', toggleUserActive);
router.get('/employees',        getAllEmployees);
router.get('/employees/:id/full-history', getEmployeeFullHistory);
router.get('/sales',            getAllSalesSubmissions);
router.patch('/sales/:id',      updateSale);
router.get('/sales/leaderboard', getSalesLeaderboard);
router.get('/sales/closer-leaderboard', getCloserLeaderboard);
router.get('/salaries',         getAllSalaries);
router.patch('/salaries/:id',    updateSalary);

// Bulk delete routes (must be registered BEFORE /:id routes)
router.delete('/sales/bulk',      bulkDeleteSales);
router.delete('/salaries/bulk',   bulkDeleteSalaries);
router.delete('/employees/bulk',  bulkDeleteEmployees);

// Single delete routes
router.delete('/sales/:id',       deleteSale);
router.delete('/salaries/:id',    deleteSalary);
router.delete('/employees/:id',   deleteEmployee);

// Fines
router.get('/fines',              getAllFines);
router.patch('/fines/:id/approve', approveFine);
router.delete('/fines/:id',       deleteFine);

// Attendance
router.get('/attendance',         getAllAttendance);
router.patch('/attendance/:id',   updateAttendance);

// Audit log
router.get('/audit-logs',         getAuditLogs);
router.get('/audit-logs/:id',     getAuditLogById);
router.get('/audit-logs/:id/restore-preview', previewRestore);
router.post('/audit-logs/:id/restore', restoreFromAudit);

// Settings
router.get('/settings', getSettings);
router.put('/settings/fine-amounts', updateFineAmounts);

// Messages
router.get('/messages',           getAllMessages);
router.patch('/messages/:id/respond', respondToMessage);
router.patch('/messages/:id/resolve', resolveMessage);

export default router;

