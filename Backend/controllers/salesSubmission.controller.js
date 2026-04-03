import SalesTarget from '../models/SalesTarget.js';
import Employee from '../models/Employee.js';

// Create a new sales submission (from Google Form or manual)
const createSubmission = async (req, res, next) => {
  try {
    const { agent, agentName, agentPhone, customer, dids, closer, saleDate, submissionSource, googleFormResponseId } = req.body;

    console.log('📥 Received submission request:', {
      agent,
      agentName,
      customer,
      dids,
      closer,
      saleDate,
      submissionSource
    });

    // Validate required fields
    if (!agent || !agentName || !customer || !dids || !closer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: agent, agentName, customer, dids, closer'
      });
    }

    // Validate customer object structure
    if (!customer.firstName || !customer.lastName || !customer.phone || !customer.state || !customer.zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer data. Required: firstName, lastName, phone, state, zipCode'
      });
    }

    // Create submission with PENDING status
    const submission = new SalesTarget({
      agent,
      agentName,
      customer,
      dids,
      closer,
      saleDate: saleDate || new Date(),
      status: 'pending',  // Start as pending
      baseSalary: 1000,
      pricePerSale: 1000
    });

    console.log('✅ Created submission object:', submission);

    await submission.save();

    console.log('✅ Saved successfully:', submission._id);

    res.status(201).json({
      success: true,
      message: 'Sales submission created successfully',
      data: submission
    });
  } catch (error) {
    console.error('❌ Error creating submission:', error.message);
    next(error);
  }
};

// Get all submissions with optional status filter
const getSubmissions = async (req, res, next) => {
  try {
    console.log('=== GET /api/sales-submissions ===');
    console.log('User:', req.user);
    console.log('Query:', req.query);

    const { status, agentId, page = 1, limit = 50 } = req.query;

    // Validate limit and page are numbers
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (agentId) filter.agent = agentId;

    const skip = (pageNum - 1) * limitNum;

    console.log('Filter:', filter, 'Skip:', skip, 'Limit:', limitNum);

    const submissions = await SalesTarget.find(filter)
      .populate('agent', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .populate('disapprovedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await SalesTarget.countDocuments(filter);

    console.log('Found submissions:', submissions.length, 'Total:', total);

    res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in getSubmissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions',
      error: error.message
    });
  }
};

// Get submission by ID
const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await SalesTarget.findById(req.params.id)
      .populate('agent', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .populate('disapprovedBy', 'firstName lastName');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Sales submission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Approve a single submission
const approveSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;

    const submission = await SalesTarget.findById(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Sales submission not found'
      });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve submission with status: ${submission.status}`
      });
    }

    // Update to approved status
    submission.status = 'approved';
    submission.approvedBy = req.user._id;
    submission.approvedAt = new Date();
    await submission.save();  // This triggers post-save hook to calculate bonus

    res.status(200).json({
      success: true,
      message: 'Sales submission approved successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Disapprove a single submission
const disapproveSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const submission = await SalesTarget.findById(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Sales submission not found'
      });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot disapprove submission with status: ${submission.status}`
      });
    }

    // Update to disapproved status
    submission.status = 'disapproved';
    submission.disapprovedBy = req.user._id;
    submission.disapprovedAt = new Date();
    submission.rejectionReason = rejectionReason || '';
    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Sales submission disapproved successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Bulk approve submissions
const bulkApproveSubmissions = async (req, res, next) => {
  try {
    const { submissionIds } = req.body;

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'submissionIds must be a non-empty array'
      });
    }

    const submissions = await SalesTarget.find({
      _id: { $in: submissionIds },
      status: 'pending'
    });

    if (submissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending submissions found with provided IDs'
      });
    }

    const approvalResults = [];

    for (const submission of submissions) {
      try {
        // Update to approved
        submission.status = 'approved';
        submission.approvedBy = req.user._id;
        submission.approvedAt = new Date();
        await submission.save();  // Triggers post-save hook for bonus calculation

        approvalResults.push({
          submissionId: submission._id,
          status: 'approved'
        });
      } catch (error) {
        approvalResults.push({
          submissionId: submission._id,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successCount = approvalResults.filter(r => r.status === 'approved').length;
    const failedCount = approvalResults.filter(r => r.status === 'failed').length;

    res.status(200).json({
      success: successCount > 0,
      message: `Bulk approval completed: ${successCount} approved, ${failedCount} failed`,
      data: {
        summary: {
          total: submissions.length,
          approved: successCount,
          failed: failedCount
        },
        results: approvalResults
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk disapprove submissions
const bulkDisapproveSubmissions = async (req, res, next) => {
  try {
    const { submissionIds, rejectionReason } = req.body;

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'submissionIds must be a non-empty array'
      });
    }

    const submissions = await SalesTarget.find({
      _id: { $in: submissionIds },
      status: 'pending'
    });

    if (submissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending submissions found with provided IDs'
      });
    }

    const disapprovalResults = [];

    for (const submission of submissions) {
      try {
        submission.status = 'disapproved';
        submission.disapprovedBy = req.user._id;
        submission.disapprovedAt = new Date();
        submission.rejectionReason = rejectionReason || '';
        await submission.save();

        disapprovalResults.push({
          submissionId: submission._id,
          status: 'disapproved'
        });
      } catch (error) {
        disapprovalResults.push({
          submissionId: submission._id,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successCount = disapprovalResults.filter(r => r.status === 'disapproved').length;
    const failedCount = disapprovalResults.filter(r => r.status === 'failed').length;

    res.status(200).json({
      success: successCount > 0,
      message: `Bulk disapproval completed: ${successCount} disapproved, ${failedCount} failed`,
      data: {
        summary: {
          total: submissions.length,
          disapproved: successCount,
          failed: failedCount
        },
        results: disapprovalResults
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get pending submissions count
const getPendingCount = async (req, res, next) => {
  try {
    const count = await SalesTarget.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    next(error);
  }
};

// Get analytics data for approved sales
const getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, month, year } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        saleDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else if (month && year) {
      const monthNum = parseInt(month) - 1;
      const yearNum = parseInt(year);
      const start = new Date(yearNum, monthNum, 1);
      const end = new Date(yearNum, monthNum + 1, 0);
      dateFilter = {
        saleDate: {
          $gte: start,
          $lte: end
        }
      };
    }

    // Get approved sales only
    const approvedSales = await SalesTarget.find({
      status: 'approved',
      ...dateFilter
    })
      .populate('agent', 'firstName lastName employeeId phone')
      .populate('approvedBy', 'firstName lastName')
      .sort({ saleDate: -1 });

    if (approvedSales.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        stats: {
          totalSales: 0,
          totalCSRs: 0,
          averageSalesPerCSR: 0,
          totalEarnings: 0,
          topPerformer: null
        }
      });
    }

    // Group by agent and calculate statistics
    const byAgent = {};
    approvedSales.forEach(sale => {
      const agentId = sale.agent?._id?.toString() || sale.agent;
      if (!byAgent[agentId]) {
        byAgent[agentId] = {
          agent: sale.agent,
          agentName: sale.agentName,
          totalSales: 0,
          totalEarnings: 0,
          records: []
        };
      }
      byAgent[agentId].totalSales += 1; // Each sale submission = 1 sale
      byAgent[agentId].totalEarnings += sale.pricePerSale || 1000;
      byAgent[agentId].records.push(sale);
    });

    const agents = Object.values(byAgent);
    const totalSales = approvedSales.length;
    const totalCSRs = agents.length;
    const totalEarnings = agents.reduce((sum, a) => sum + a.totalEarnings, 0);
    const averageSalesPerCSR = totalCSRs > 0 ? Math.round((totalSales / totalCSRs) * 100) / 100 : 0;

    // Find top performer
    let topPerformer = agents[0];
    agents.forEach(agent => {
      if (agent.totalEarnings > topPerformer.totalEarnings) {
        topPerformer = agent;
      }
    });

    res.status(200).json({
      success: true,
      data: approvedSales,
      byAgent: Object.values(byAgent),
      stats: {
        totalSales,
        totalCSRs,
        averageSalesPerCSR,
        totalEarnings,
        topPerformer
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get 30-day analytics summary
const getAnalyticsSummary = async (req, res, next) => {
  try {
    // Get sales from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const approvedSales = await SalesTarget.find({
      status: 'approved',
      saleDate: { $gte: thirtyDaysAgo }
    })
      .populate('agent', 'firstName lastName employeeId')
      .sort({ saleDate: -1 });

    // Group by agent
    const byAgent = {};
    approvedSales.forEach(sale => {
      const agentId = sale.agent?._id?.toString() || sale.agent;
      if (!byAgent[agentId]) {
        byAgent[agentId] = {
          agent: sale.agent,
          agentName: sale.agentName,
          salesCount: 0,
          earnings: 0
        };
      }
      byAgent[agentId].salesCount += 1;
      byAgent[agentId].earnings += sale.pricePerSale || 1000;
    });

    res.status(200).json({
      success: true,
      period: '30 days',
      totalSales: approvedSales.length,
      totalCSRs: Object.keys(byAgent).length,
      totalEarnings: Object.values(byAgent).reduce((sum, a) => sum + a.earnings, 0),
      byAgent: Object.values(byAgent).sort((a, b) => b.earnings - a.earnings)
    });
  } catch (error) {
    next(error);
  }
};

        pendingCount: count
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get CSR's own sales submissions (with all statuses)
const getMySales = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, status, page = 1, limit = 50 } = req.query;

    // Build filters
    const filter = { agent: userId };
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const sales = await SalesTarget.find(filter)
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await SalesTarget.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get CSR's monthly earnings from sales submissions
const getMyMonthlyEarnings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    const monthNum = month ? parseInt(month) : new Date().getMonth() + 1;
    const yearNum = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Get only APPROVED sales for this month
    const approvedSales = await SalesTarget.find({
      agent: userId,
      status: 'approved',
      saleDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('approvedBy', 'firstName lastName');

    // Get pending sales (for visibility)
    const pendingSales = await SalesTarget.find({
      agent: userId,
      status: 'pending',
      saleDate: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Get disapproved sales
    const disapprovedSales = await SalesTarget.find({
      agent: userId,
      status: 'disapproved',
      saleDate: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const totalApproved = approvedSales.length;
    const totalEarnings = totalApproved * 1000; // Each approved sale = 1000 RS
    const totalPending = pendingSales.length;
    const totalDisapproved = disapprovedSales.length;

    res.status(200).json({
      success: true,
      month: monthNum,
      year: yearNum,
      data: {
        monthlyStats: {
          totalApprovedSales: totalApproved,
          totalPendingSales: totalPending,
          totalDisapprovedSales: totalDisapproved,
          totalEarnings,
          pricePerSale: 1000,
          approvalRate: totalApproved + totalDisapproved > 0 
            ? Math.round((totalApproved / (totalApproved + totalDisapproved)) * 100)
            : 0
        },
        dailyBreakdown: approvedSales,
        pendingBreakdown: pendingSales,
        disapprovedBreakdown: disapprovedSales
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get CSR's 30-day sales summary
const getMySalesSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const approvedSales = await SalesTarget.find({
      agent: userId,
      status: 'approved',
      saleDate: { $gte: thirtyDaysAgo }
    });

    const totalEarnings = approvedSales.length * 1000;

    res.status(200).json({
      success: true,
      period: 'Last 30 days',
      data: {
        totalApprovedSales: approvedSales.length,
        totalEarnings,
        averagePerDay: approvedSales.length > 0 ? (totalEarnings / 30).toFixed(0) : 0,
        sales: approvedSales
      }
    });
  } catch (error) {
    next(error);
  }
};

export {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  approveSubmission,
  disapproveSubmission,
  bulkApproveSubmissions,
  bulkDisapproveSubmissions,
  getPendingCount,
  getAnalytics,
  getAnalyticsSummary,
  getMySales,
  getMyMonthlyEarnings,
  getMySalesSummary
};
