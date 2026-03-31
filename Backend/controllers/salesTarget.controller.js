import SalesTarget from '../models/SalesTarget.js';
import Employee from '../models/Employee.js';

/**
 * Record Daily Sales for CSR
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export const recordDailySales = async (req, res, next) => {
  try {
    const { employeeId, salesCount, date, notes } = req.body;

    console.log('=== recordDailySales ===');
    console.log('Body received:', req.body);
    console.log('employeeId:', employeeId);
    console.log('salesCount:', salesCount);
    console.log('date:', date);

    // Validation
    if (!employeeId || salesCount === undefined) {
      console.error('❌ Missing required fields:', { employeeId, salesCount });
      return res.status(400).json({
        success: false,
        message: 'employeeId and salesCount are required'
      });
    }

    if (salesCount < 0 || salesCount > 1) {
      return res.status(400).json({
        success: false,
        message: 'Each sale must be recorded individually (salesCount = 1 per submission)'
      });
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Create new sales record with the transaction-based schema
    const saleDate = date ? new Date(date) : new Date();
    
    const salesRecord = await SalesTarget.create({
      agent: employeeId,
      agentName: `${employee.firstName} ${employee.lastName}`,
      customer: {
        firstName: 'Admin',
        lastName: 'Recorded',
        phone: '0000000000',
        state: 'Admin',
        zipCode: '00000'
      },
      dids: 'ADMIN-MANUAL',
      closer: 'Admin',
      salesCount: 1,  // Always 1 per transaction
      saleDate
    });

    // Populate agent details
    await salesRecord.populate('agent', 'firstName lastName employeeId');

    return res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: {
        _id: salesRecord._id,
        agent: salesRecord.agent,
        agentName: salesRecord.agentName,
        salesCount: salesRecord.salesCount,
        baseSalary: salesRecord.baseSalary,
        achievedTier: salesRecord.achievedTier,
        tierBonus: salesRecord.tierBonus,
        totalEarning: salesRecord.totalEarning,
        saleDate: salesRecord.saleDate,
        tierInfo: {
          tier: salesRecord.achievedTier,
          tierName: getTierName(salesRecord.achievedTier),
          totalEarning: salesRecord.totalEarning
        }
      }
    });

  } catch (error) {
    console.error('Error recording sales:', error);
    next(error);
  }
};

/**
 * Get CSR Daily Sales Report
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export const getCsrDailySalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const employeeId = req.user.employeeId;

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    let filter = { agent: employeeId };

    if (startDate && endDate) {
      filter.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const salesRecords = await SalesTarget.find(filter)
      .populate('agent', 'firstName lastName employeeId')
      .sort({ saleDate: -1 });

    // Calculate summary
    const summary = {
      totalDays: salesRecords.length,
      totalSales: 0,
      totalEarnings: 0,
      averageSalesPerDay: 0,
      topDay: null,
      tiers: { tier1: 0, tier2: 0, tier3: 0, noTier: 0 }
    };

    salesRecords.forEach(record => {
      summary.totalSales += record.salesCount;
      summary.totalEarnings += record.totalEarning;
      
      // Count tiers
      if (record.achievedTier === 1) summary.tiers.tier1++;
      else if (record.achievedTier === 2) summary.tiers.tier2++;
      else if (record.achievedTier === 3) summary.tiers.tier3++;
      else summary.tiers.noTier++;

      // Find top day
      if (!summary.topDay || record.salesCount > summary.topDay.salesCount) {
        summary.topDay = {
          date: record.saleDate,
          sales: record.salesCount,
          earning: record.totalEarning
        };
      }
    });

    if (summary.totalDays > 0) {
      summary.averageSalesPerDay = Math.round(summary.totalSales / summary.totalDays * 100) / 100;
    }

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId
        },
        period: startDate && endDate ? {
          from: startDate,
          to: endDate
        } : { from: 'All time' },
        summary,
        records: salesRecords.map(r => ({
          date: r.saleDate,
          sales: r.salesCount,
          tier: getTierName(r.achievedTier),
          baseSalary: r.baseSalary,
          tierBonus: r.tierBonus,
          totalEarning: r.totalEarning
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching sales report:', error);
    next(error);
  }
};

/**
 * Get Monthly Earnings for CSR
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export const getCsrMonthlyEarnings = async (req, res, next) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year and month are required'
      });
    }

    // Admins don't have employee records or earnings
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins do not have sales earnings'
      });
    }

    // Find employee record linked to user
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for current user'
      });
    }

    // Get month's sales
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const salesRecords = await SalesTarget.find({
      agent: employee._id,
      saleDate: { $gte: startDate, $lte: endDate }
    }).sort({ saleDate: 1 });

    // Calculate monthly stats
    const monthlyStats = {
      month: new Date(year, month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' }),
      totalDays: salesRecords.length,
      totalSales: 0,
      totalBaseSalary: 0,
      totalTierBonus: 0,
      totalEarnings: 0,
      averageSalesPerDay: 0,
      bestDay: null,
      worstDay: null,
      daysPerTier: { tier1: 0, tier2: 0, tier3: 0, noTier: 0 }
    };

    salesRecords.forEach(record => {
      monthlyStats.totalSales += record.salesCount;
      monthlyStats.totalBaseSalary += record.baseSalary;
      monthlyStats.totalTierBonus += record.tierBonus;
      monthlyStats.totalEarnings += record.totalEarning;

      // Count by tier
      if (record.achievedTier === 1) monthlyStats.daysPerTier.tier1++;
      else if (record.achievedTier === 2) monthlyStats.daysPerTier.tier2++;
      else if (record.achievedTier === 3) monthlyStats.daysPerTier.tier3++;
      else monthlyStats.daysPerTier.noTier++;

      // Best and worst days
      if (!monthlyStats.bestDay || record.salesCount > monthlyStats.bestDay.sales) {
        monthlyStats.bestDay = {
          date: record.saleDate,
          sales: record.salesCount,
          earning: record.totalEarning
        };
      }
      if (!monthlyStats.worstDay || record.salesCount < monthlyStats.worstDay.sales) {
        monthlyStats.worstDay = {
          date: record.saleDate,
          sales: record.salesCount,
          earning: record.totalEarning
        };
      }
    });

    if (monthlyStats.totalDays > 0) {
      monthlyStats.averageSalesPerDay = Math.round(monthlyStats.totalSales / monthlyStats.totalDays * 100) / 100;
    }

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId
        },
        monthlyStats,
        dailyBreakdown: salesRecords.map(r => ({
          date: r.saleDate,
          sales: r.salesCount,
          tier: getTierName(r.achievedTier),
          baseSalary: r.baseSalary,
          tierBonus: r.tierBonus,
          totalEarning: r.totalEarning
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching monthly earnings:', error);
    next(error);
  }
};

/**
 * Get All CSR Sales (Admin)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export const getAllCsrSales = async (req, res, next) => {
  try {
    const { department, startDate, endDate, page = 1, limit = 50 } = req.query;

    let filter = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (department) {
      const employees = await Employee.find({ department }).select('_id');
      filter.employee = { $in: employees.map(e => e._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const salesRecords = await SalesTarget.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SalesTarget.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: salesRecords,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching all sales:', error);
    next(error);
  }
};

/**
 * Delete Sales Record (Admin)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export const deleteSalesRecord = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await SalesTarget.findByIdAndDelete(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Sales record not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Sales record deleted successfully',
      data: record
    });

  } catch (error) {
    console.error('Error deleting sales record:', error);
    next(error);
  }
};

/**
 * Submit Google Form Data
 * Public endpoint for Google Form webhook integration
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export const submitGoogleFormData = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      state,
      zipCode,
      dids,
      closer,
      agentName,
      selectedAgentId,
      submissionDate = new Date(),
      googleFormResponseId = ''
    } = req.body;

    // Validation
    if (!firstName || !lastName || !phone || !state || !zipCode || !dids || !closer || !agentName || !selectedAgentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        requiredFields: [
          'firstName', 'lastName', 'phone', 'state', 'zipCode', 
          'dids', 'closer', 'agentName', 'selectedAgentId'
        ]
      });
    }

    // Verify employee exists
    const employee = await Employee.findById(selectedAgentId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found with provided ID'
      });
    }

    // Create pending submission (will be approved/disapproved by admin)
    const submission = await SalesTarget.create({
      agent: selectedAgentId,
      agentName: agentName.trim(),
      customer: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        state: state.trim(),
        zipCode: zipCode.trim()
      },
      dids: dids.trim(),
      closer: closer.trim(),
      saleDate: new Date(submissionDate),
      status: 'pending',  // Start as pending - awaiting admin approval
      baseSalary: 1000,
      pricePerSale: 1000
    });

    await submission.populate('agent', 'firstName lastName employeeId');

    return res.status(201).json({
      success: true,
      message: 'Sales submission received and queued for approval',
      data: {
        _id: submission._id,
        status: submission.status,
        agent: submission.agent,
        agentName: submission.agentName,
        customer: submission.customer,
        dids: submission.dids,
        closer: submission.closer,
        saleDate: submission.saleDate,
        submittedAt: submission.createdAt,
        message: 'Your submission is pending admin approval. Once approved, it will be added to your sales record.'
      }
    });

  } catch (error) {
    console.error('Error submitting Google Form data:', error);
    next(error);
  }
};

// Helper functions
function getTierName(tier) {
  switch(tier) {
    case 1: return 'Tier 1 (5-6 sales)';
    case 2: return 'Tier 2 (7-9 sales)';
    case 3: return 'Tier 3 (10+ sales)';
    default: return 'No Tier (Below 5 sales)';
  }
}

function getTierDescription(tier, record) {
  const pricePerSale = record.pricePerSale || 1000;
  switch(tier) {
    case 1: return `Base rate: RS${pricePerSale}/sale × ${record.salesCount} = RS${record.baseSalary}`;
    case 2: return `Base (RS${pricePerSale}/sale × ${record.salesCount} = RS${record.baseSalary}) + 20% bonus (RS${record.tierBonus})`;
    case 3: return `Base (RS${pricePerSale}/sale × ${record.salesCount} = RS${record.baseSalary}) + 50% bonus (RS${record.tierBonus})`;
    default: return `Below minimum target (${record.salesCount} sales)`;
  }
}
