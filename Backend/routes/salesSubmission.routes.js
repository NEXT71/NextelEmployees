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

// Get all submissions (admin only)
router.get('/', auth, admin, getSubmissions);

// Get pending count (admin only)
router.get('/pending/count', auth, admin, getPendingCount);

// Get submission by ID (admin only)
router.get('/:id', auth, admin, getSubmissionById);

// Single approval (admin only)
router.post('/:id/approve', auth, admin, approveSubmission);

// Single disapproval (admin only)
router.post('/:id/disapprove', auth, admin, disapproveSubmission);

// Bulk approval (admin only)
router.post('/bulk/approve', auth, admin, bulkApproveSubmissions);

// Bulk disapproval (admin only)
router.post('/bulk/disapprove', auth, admin, bulkDisapproveSubmissions);

export default router;
