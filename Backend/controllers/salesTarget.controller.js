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

    // Validation
    if (!employeeId || salesCount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'employeeId and salesCount are required'
      });
    }

    if (salesCount < 0) {
      return res.status(400).json({
        success: false,
        message: 'salesCount cannot be negative'
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

    // Check if record exists for this date
    const recordDate = date ? new Date(date).toDateString() : new Date().toDateString();
    const existingRecord = await SalesTarget.findOne({
      employee: employeeId,
      date: recordDate
    });

    let salesRecord;
    if (existingRecord) {
      // Update existing record
      existingRecord.salesCount = salesCount;
      if (notes) existingRecord.notes = notes;
      salesRecord = await existingRecord.save();
    } else {
      // Create new record
      salesRecord = await SalesTarget.create({
        employee: employeeId,
        date: recordDate,
        salesCount,
        notes
      });
    }

    // Populate employee details
    await salesRecord.populate('employee', 'firstName lastName employeeId');

    return res.status(201).json({
      success: true,
      message: 'Sales recorded successfully',
      data: {
        ...salesRecord.toObject(),
        tierInfo: {
          tier: salesRecord.achievedTier,
          tierName: getTierName(salesRecord.achievedTier),
          description: getTierDescription(salesRecord.achievedTier, salesRecord)
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
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'employeeId is required'
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

    let filter = { employee: employeeId };

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const salesRecords = await SalesTarget.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .sort({ date: -1 });

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
      summary.totalEarnings += record.totalEarningForDay;
      
      // Count tiers
      if (record.achievedTier === 1) summary.tiers.tier1++;
      else if (record.achievedTier === 2) summary.tiers.tier2++;
      else if (record.achievedTier === 3) summary.tiers.tier3++;
      else summary.tiers.noTier++;

      // Find top day
      if (!summary.topDay || record.salesCount > summary.topDay.salesCount) {
        summary.topDay = {
          date: record.date,
          sales: record.salesCount,
          earning: record.totalEarningForDay
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
          date: r.date,
          sales: r.salesCount,
          tier: getTierName(r.achievedTier),
          baseSalary: r.baseSalaryForDay,
          tierBonus: r.tierBonus,
          totalEarning: r.totalEarningForDay,
          notes: r.notes
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
    const { employeeId, year, month } = req.query;

    if (!employeeId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, year, and month are required'
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

    // Get month's sales
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const salesRecords = await SalesTarget.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

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
      monthlyStats.totalBaseSalary += record.baseSalaryForDay;
      monthlyStats.totalTierBonus += record.tierBonus;
      monthlyStats.totalEarnings += record.totalEarningForDay;

      // Count by tier
      if (record.achievedTier === 1) monthlyStats.daysPerTier.tier1++;
      else if (record.achievedTier === 2) monthlyStats.daysPerTier.tier2++;
      else if (record.achievedTier === 3) monthlyStats.daysPerTier.tier3++;
      else monthlyStats.daysPerTier.noTier++;

      // Best and worst days
      if (!monthlyStats.bestDay || record.salesCount > monthlyStats.bestDay.sales) {
        monthlyStats.bestDay = {
          date: record.date,
          sales: record.salesCount,
          earning: record.totalEarningForDay
        };
      }
      if (!monthlyStats.worstDay || record.salesCount < monthlyStats.worstDay.sales) {
        monthlyStats.worstDay = {
          date: record.date,
          sales: record.salesCount,
          earning: record.totalEarningForDay
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
          date: r.date,
          sales: r.salesCount,
          tier: getTierName(r.achievedTier),
          baseSalary: r.baseSalaryForDay,
          tierBonus: r.tierBonus,
          totalEarning: r.totalEarningForDay
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
    case 1: return `Base rate: RS${pricePerSale}/sale × ${record.salesCount} = RS${record.baseSalaryForDay}`;
    case 2: return `Base (RS${pricePerSale}/sale × ${record.salesCount} = RS${record.baseSalaryForDay}) + 20% bonus (RS${record.tierBonus})`;
    case 3: return `Base (RS${pricePerSale}/sale × ${record.salesCount} = RS${record.baseSalaryForDay}) + 50% bonus (RS${record.tierBonus})`;
    default: return `Below minimum target (${record.salesCount}/${record.targetTiers.tier1.minSales} sales)`;
  }
}
