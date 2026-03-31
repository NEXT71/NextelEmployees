import express from 'express';
const router = express.Router();
import {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  approveSubmission,
  disapproveSubmission,
  bulkApproveSubmissions,
  bulkDisapproveSubmissions,
  getPendingCount
} from '../controllers/salesSubmission.controller.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';

// Public endpoint - Google Form webhook
router.post('/create', createSubmission);

// Static routes BEFORE dynamic routes
router.get('/pending/count', auth, admin, getPendingCount);
router.post('/bulk/approve', auth, admin, bulkApproveSubmissions);
router.post('/bulk/disapprove', auth, admin, bulkDisapproveSubmissions);

// Get all submissions (admin only)
router.get('/', auth, admin, getSubmissions);

// Dynamic routes - Get submission by ID (admin only)
router.get('/:id', auth, admin, getSubmissionById);

// Single approval (admin only)
router.post('/:id/approve', auth, admin, approveSubmission);

// Single disapproval (admin only)
router.post('/:id/disapprove', auth, admin, disapproveSubmission);

export default router;
