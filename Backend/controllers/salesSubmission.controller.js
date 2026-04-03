import SalesTarget from '../models/SalesTarget.js';
import Employee from '../models/Employee.js';
import mongoose from 'mongoose';

// Helper: resolve employee._id from a user _id (for consistent agent storage)
const resolveEmployeeId = async (userId) => {
  if (!userId) return null;
  try {
    const emp = await Employee.findOne({ user: userId }).select('_id');
    return emp ? emp._id : null;
  } catch {
    return null;
  }
};

// Helper: get employee._id for the currently logged-in CSR
const getMyEmployeeId = async (userId) => {
  if (!userId) return null;
  try {
    const emp = await Employee.findOne({ user: userId }).select('_id');
    return emp ? emp._id : null;
  } catch {
    return null;
  }
};

// Create a new sales submission (from Google Form or manual)
const createSubmission = async (req, res, next) => {
  try {
    let { agent, agentName, agentPhone, customer, dids, closer, saleDate, submissionSource, googleFormResponseId } = req.body;

    // Fallback: If agentName is undefined/empty, use customer name
    if (!agentName || agentName === 'undefined' || agentName === 'undefined undefined') {
      agentName = customer && customer.firstName 
        ? `${customer.firstName} ${customer.lastName}`.trim()
        : 'Unknown Agent';
    }

    // If agent is a user _id, resolve to employee _id for consistency
    let resolvedAgent = null;
    if (agent) {
      // Try to resolve as employee directly first, then as user
      if (mongoose.Types.ObjectId.isValid(agent)) {
        const empDirect = await Employee.findById(agent).select('_id');
        if (empDirect) {
          resolvedAgent = empDirect._id;
        } else {
          // Try as user reference
          resolvedAgent = await resolveEmployeeId(agent);
        }
      }
    }

    // Validate required fields
    if (!agentName || !customer || !dids || !closer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: agentName, customer, dids, closer'
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
      agent: resolvedAgent,  // always store employee _id (or null for Google Form without match)
      agentName,
      customer,
      dids,
      closer,
      saleDate: saleDate || new Date(),
      status: 'pending',
      baseSalary: 1000,
      pricePerSale: 1000
    });

    await submission.save();

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

// Handle Google Form webhook submissions
const handleGoogleFormWebhook = async (req, res, next) => {
  try {
    // Validate webhook secret
    const webhookSecret = req.headers['x-webhook-secret'] || req.body.webhookSecret;
    const expectedSecret = process.env.GOOGLE_FORM_WEBHOOK_SECRET;
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return res.status(401).json({ success: false, message: 'Invalid webhook secret' });
    }

    // Map Google Form fields — the script sends pre-mapped data
    const {
      agentName,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerState,
      customerZipCode,
      dids,
      closer,
      saleDate
    } = req.body;

    if (!agentName || !customerFirstName || !customerLastName || !customerPhone || !customerState || !customerZipCode || !dids || !closer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Google Form fields'
      });
    }

    // Try to match agent by name to an employee record
    const nameParts = agentName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    let matchedEmployee = null;
    if (firstName) {
      matchedEmployee = await Employee.findOne({
        firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
        ...(lastName && { lastName: { $regex: new RegExp(`^${lastName}$`, 'i') } })
      }).select('_id');
    }

    const submission = new SalesTarget({
      agent: matchedEmployee ? matchedEmployee._id : null,
      agentName: agentName.trim(),
      customer: {
        firstName: customerFirstName.trim(),
        lastName: customerLastName.trim(),
        phone: customerPhone.trim(),
        state: customerState.trim(),
        zipCode: customerZipCode.trim()
      },
      dids: dids.trim(),
      closer: closer.trim(),
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      status: 'pending',
      baseSalary: 1000,
      pricePerSale: 1000,
      submissionSource: 'Google Form'
    });

    await submission.save();

    return res.status(201).json({
      success: true,
      message: 'Google Form submission received and queued for admin review',
      submissionId: submission._id
    });
  } catch (error) {
    console.error('❌ Google Form webhook error:', error.message);
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

    console.log('📊 Analytics request received with query:', { startDate, endDate, month, year });
    
    // Query ALL approved sales first (no date filter) to see what we have
    const allApprovedSales = await SalesTarget.find({ status: 'approved' })
      .populate('agent', 'firstName lastName employeeId phone')
      .populate('approvedBy', 'firstName lastName')
      .sort({ saleDate: -1 });

    console.log('🔍 Total approved sales in DB:', allApprovedSales.length);
    console.log('📋 Sales details:', allApprovedSales.map(s => ({
      id: s._id,
      agentName: s.agentName,
      saleDate: s.saleDate,
      approvedAt: s.approvedAt,
      status: s.status
    })));

    // Use all approved sales (no date filtering for now, to test)
    const approvedSales = allApprovedSales;

    console.log('📊 Analytics Query:', {
      totalFound: approvedSales.length,
      salesCount: approvedSales.length > 0 ? 'Has data ✓' : 'No data ✗'
    });

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

// Helper: calculate daily tier bonus for a day's sale count
const calcTierBonus = (count) => {
  if (count >= 12) return 5000;
  if (count >= 8) return 3000;
  if (count >= 5) return 1000;
  if (count >= 3) return 500;
  return 0;
};

// Helper: get tier name from count
const getTierNameFromCount = (count) => {
  if (count >= 12) return 'tier4';
  if (count >= 8) return 'tier3';
  if (count >= 5) return 'tier2';
  if (count >= 3) return 'tier1';
  return 'noTier';
};

// Get CSR's own sales submissions (with all statuses)
const getMySales = async (req, res, next) => {
  try {
    const { startDate, endDate, status, page = 1, limit = 50 } = req.query;

    // Resolve employee._id from logged-in user
    const employeeId = await getMyEmployeeId(req.user._id);
    const agentFilter = employeeId ? { agent: employeeId } : { agent: req.user._id };

    const filter = { ...agentFilter };
    if (status && status !== 'all') filter.status = status;
    if (startDate && endDate) {
      filter.saleDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const sales = await SalesTarget.find(filter)
      .populate('approvedBy', 'firstName lastName')
      .populate('disapprovedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await SalesTarget.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: sales,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

// Get CSR's monthly earnings from sales submissions
const getMyMonthlyEarnings = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const monthNum = month ? parseInt(month) : new Date().getMonth() + 1;
    const yearNum = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Resolve to employee._id for consistent querying
    const employeeId = await getMyEmployeeId(req.user._id);
    const agentFilter = employeeId ? { agent: employeeId } : { agent: req.user._id };

    const [approvedSales, pendingSales, disapprovedSales] = await Promise.all([
      SalesTarget.find({ ...agentFilter, status: 'approved', saleDate: { $gte: startDate, $lte: endDate } })
        .populate('approvedBy', 'firstName lastName')
        .sort({ saleDate: 1 }),
      SalesTarget.find({ ...agentFilter, status: 'pending', saleDate: { $gte: startDate, $lte: endDate } })
        .sort({ saleDate: -1 }),
      SalesTarget.find({ ...agentFilter, status: 'disapproved', saleDate: { $gte: startDate, $lte: endDate } })
        .populate('disapprovedBy', 'firstName lastName')
        .sort({ saleDate: -1 })
    ]);

    // Calculate daily tier bonuses from approved sales
    const salesByDay = {};
    approvedSales.forEach(sale => {
      const dayKey = new Date(sale.saleDate).toDateString();
      salesByDay[dayKey] = (salesByDay[dayKey] || 0) + 1;
    });

    let totalTierBonus = 0;
    const daysPerTier = { tier1: 0, tier2: 0, tier3: 0, tier4: 0, noTier: 0 };
    Object.values(salesByDay).forEach(count => {
      totalTierBonus += calcTierBonus(count);
      const tierKey = getTierNameFromCount(count);
      daysPerTier[tierKey]++;
    });

    const totalApproved = approvedSales.length;
    const totalBaseSalary = totalApproved * 1000;
    const totalEarnings = totalBaseSalary + totalTierBonus;
    const totalDays = Object.keys(salesByDay).length;

    // Build daily breakdown for the dashboard table
    const dailyBreakdown = Object.entries(salesByDay).map(([date, count]) => ({
      date,
      sales: count,
      tier: getTierNameFromCount(count),
      baseSalary: count * 1000,
      tierBonus: calcTierBonus(count),
      totalEarning: count * 1000 + calcTierBonus(count)
    }));

    res.status(200).json({
      success: true,
      month: monthNum,
      year: yearNum,
      data: {
        monthlyStats: {
          month: new Date(yearNum, monthNum - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' }),
          totalDays,
          totalSales: totalApproved,
          totalBaseSalary,
          totalTierBonus,
          totalEarnings,
          totalPendingSales: pendingSales.length,
          totalDisapprovedSales: disapprovedSales.length,
          approvalRate: totalApproved + disapprovedSales.length > 0
            ? Math.round((totalApproved / (totalApproved + disapprovedSales.length)) * 100)
            : 0,
          daysPerTier
        },
        dailyBreakdown,
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const employeeId = await getMyEmployeeId(req.user._id);
    const agentFilter = employeeId ? { agent: employeeId } : { agent: req.user._id };

    const approvedSales = await SalesTarget.find({
      ...agentFilter,
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
        averagePerDay: approvedSales.length > 0 ? Math.round(totalEarnings / 30) : 0,
        sales: approvedSales
      }
    });
  } catch (error) {
    next(error);
  }
};

export {
  createSubmission,
  handleGoogleFormWebhook,
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
