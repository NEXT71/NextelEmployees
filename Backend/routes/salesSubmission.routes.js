import express from 'express';
const router = express.Router();
import {
  createSubmission,
  handleGoogleFormWebhook,
  getSubmissions,
  getSubmissionById,
  approveSubmission,
  disapproveSubmission,
  assignAgent,
  getAssignableAgents,
  bulkApproveSubmissions,
  bulkDisapproveSubmissions,
  getPendingCount,
  getAnalytics,
  getAnalyticsSummary,
  getMySales,
  getMyMonthlyEarnings,
  getMySalesSummary,
  getMyCloses,
  getMyClosesStats
} from '../controllers/salesSubmission.controller.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';
import qa from '../middlewares/qa.js';

// DEBUG: Health check endpoint (no auth)
router.get('/debug/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sales submissions API is online',
    timestamp: new Date().toISOString()
  });
});

// DEBUG: Comprehensive diagnostic endpoint (admin only - exposes customer data)
router.get('/debug/status', auth, admin, async (req, res) => {
  try {
    const SalesTarget = (await import('../models/SalesTarget.js')).default;
    const db = SalesTarget.collection.conn.db;
    
    // Get total records
    const totalRecords = await SalesTarget.countDocuments();
    
    // Get records by status
    const recordsByStatus = await SalesTarget.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get current indexes
    const indexes = await db.collection('salestartgets').getIndexes();
    
    // Get recent records
    const records = await SalesTarget.find()
      .populate('agent', 'firstName lastName employeeId phone')
      .sort({ createdAt: -1 })
      .limit(20);
    
    const statusBreakdown = {};
    recordsByStatus.forEach(item => {
      statusBreakdown[item._id || 'unknown'] = item.count;
    });
    
    res.json({
      success: true,
      database: {
        totalRecords,
        byStatus: statusBreakdown,
        indexes: Object.keys(indexes),
        hasUniqueIndexes: Object.entries(indexes).filter(([k, v]) => v.unique).map(([k]) => k)
      },
      recentRecords: records.map(r => ({
        _id: r._id,
        agent: r.agent,
        agentName: r.agentName,
        customer: r.customer,
        stat: r.status,
        saleDate: r.saleDate,
        createdAt: r.createdAt
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DEBUG: Show all sales records (admin only - exposes customer data)
router.get('/debug/all-records', auth, admin, async (req, res) => {
  try {
    const SalesTarget = (await import('../models/SalesTarget.js')).default;
    const records = await SalesTarget.find()
      .populate('agent', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(100);
    
    const byStatus = {};
    records.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    
    res.json({
      success: true,
      totalRecords: records.length,
      byStatus,
      records: records.map(r => ({
        _id: r._id,
        agent: r.agent,
        agentName: r.agentName,
        status: r.status,
        saleDate: r.saleDate,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public endpoint - CSR portal form submission
router.post('/create', createSubmission);

// Google Form webhook (dedicated endpoint with optional secret key validation)
router.post('/google-form-webhook', handleGoogleFormWebhook);

// Analytics endpoints (admin only)
router.get('/analytics/summary', auth, admin, getAnalyticsSummary);
router.get('/analytics/detailed', auth, admin, getAnalytics);

// CSR endpoints (auth required, not admin)
router.get('/my/sales', auth, getMySales);
router.get('/my/monthly-earnings', auth, getMyMonthlyEarnings);
router.get('/my/summary', auth, getMySalesSummary);

// Closer/Verifier endpoints (auth required)
router.get('/my/closes', auth, getMyCloses);
router.get('/my/closes/stats', auth, getMyClosesStats);

// Static routes BEFORE dynamic routes
router.get('/pending/count', auth, qa, getPendingCount);
router.get('/agents', auth, qa, getAssignableAgents);
router.post('/bulk/approve', auth, qa, bulkApproveSubmissions);
router.post('/bulk/disapprove', auth, qa, bulkDisapproveSubmissions);

// Get all submissions (qa + admin + superadmin)
router.get('/', auth, qa, getSubmissions);

// Dynamic routes - Get submission by ID (qa + admin + superadmin)
router.get('/:id', auth, qa, getSubmissionById);

// Single approval (qa + admin + superadmin)
router.post('/:id/approve', auth, qa, approveSubmission);

// Link an under-review sale to a registered employee (qa + admin + superadmin)
router.post('/:id/assign-agent', auth, qa, assignAgent);

// Single disapproval (qa + admin + superadmin)
router.post('/:id/disapprove', auth, qa, disapproveSubmission);

export default router;
