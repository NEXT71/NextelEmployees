import express from 'express';
import {
  recordDailySales,
  getCsrDailySalesReport,
  getCsrMonthlyEarnings,
  getAllCsrSales,
  deleteSalesRecord,
  submitGoogleFormData
} from '../controllers/salesTarget.controller.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';

const router = express.Router();

// Public endpoint for Google Form submissions (no auth required)
router.post('/submit-form', submitGoogleFormData);

// All other routes require authentication
router.use(auth);

// CSR Routes (Employee can view their own data)
router.get('/my-sales-report', getCsrDailySalesReport);
router.get('/my-monthly-earnings', getCsrMonthlyEarnings);

// Admin Routes
router.post('/record', admin, recordDailySales);
router.get('/all', admin, getAllCsrSales);
router.delete('/:id', admin, deleteSalesRecord);

export default router;
