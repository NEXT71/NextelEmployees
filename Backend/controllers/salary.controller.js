import Salary from '../models/Salary.js';
import Employee from '../models/Employee.js';
import Fine from '../models/Fine.js';
import Attendance from '../models/Attendance.js';
import SalesTarget from '../models/SalesTarget.js';

// Helper: calculate daily tier bonus from sales count
const calcDailyTierBonus = (count) => {
  if (count >= 12) return 5000;
  if (count >= 8) return 3000;
  if (count >= 5) return 1000;
  if (count >= 3) return 500;
  return 0;
};

/**
 * Generate Monthly Salary
 * Admin only - calculates salary based on base salary, fines, and absences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export const generateMonthlySalary = async (req, res, next) => {
  try {
    const { employeeId, targetMonth, targetYear } = req.body;

    // Validation
    if (!employeeId || targetMonth === undefined || !targetYear) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, targetMonth, and targetYear are required'
      });
    }

    // Validate month (1-12)
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'targetMonth must be between 1 and 12'
      });
    }

    // Fetch employee
    const employee = await Employee.findById(employeeId).select('baseSalary isCloser');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // ── Closer (Verifier) salary path ──────────────────────────────────────
    if (employee.isCloser) {
      const approvedCloses = await SalesTarget.countDocuments({
        closerRef: employeeId,
        status: 'approved',
        saleDate: { $gte: monthStart, $lte: monthEnd }
      });

      const totalCloserPay = approvedCloses * 100;

      const existingSalary = await Salary.findOne({ employee: employeeId, month: monthStart });
      if (existingSalary) {
        return res.status(409).json({
          success: false,
          message: 'Salary record already exists for this month',
          data: existingSalary
        });
      }

      const closerNotes = `Verifier/Closer Pay: ${totalCloserPay} RS (${approvedCloses} approved closes × 100 RS)`;
      const salary = await Salary.create({
        employee: employeeId,
        month: monthStart,
        baseSalary: 0,
        bonuses: totalCloserPay,
        deductions: 0,
        notes: closerNotes
      });

      await salary.populate('employee', 'firstName lastName employeeId email');

      return res.status(201).json({
        success: true,
        message: 'Closer salary generated successfully',
        data: {
          ...salary.toObject(),
          breakdown: {
            approvedCloses,
            ratePerClose: 100,
            totalCloserPay,
            netPay: totalCloserPay
          }
        }
      });
    }
    // ── End closer salary path ─────────────────────────────────────────────

    const baseSalary = employee.baseSalary || 0;

    // Calculate date range for the target month
    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    // Query fines for the month and sum amounts
    const finesData = await Fine.find({
      employee: employeeId,
      date: { $gte: monthStart, $lte: monthEnd },
      approved: true
    }).select('amount');

    const totalFines = finesData.reduce((sum, fine) => sum + (fine.amount || 0), 0);

    // Query attendance for the month - count absent days
    const attendanceData = await Attendance.find({
      employee: employeeId,
      date: { $gte: monthStart, $lte: monthEnd },
      status: 'Absent'
    }).select('status');

    const absentDays = attendanceData.length;

    // Calculate leave deduction: (baseSalary / 30) * absentDays
    const leaveDeduction = (baseSalary / 30) * absentDays;

    // Calculate total deductions
    const totalDeductions = totalFines + leaveDeduction;

    // --- Sales earnings from approved SalesTarget submissions ---
    const approvedSales = await SalesTarget.find({
      agent: employeeId,
      status: 'approved',
      saleDate: { $gte: monthStart, $lte: monthEnd }
    }).select('saleDate pricePerSale');

    // Group by day to calculate tier bonuses
    const salesByDay = {};
    approvedSales.forEach(sale => {
      const dayKey = new Date(sale.saleDate).toDateString();
      salesByDay[dayKey] = (salesByDay[dayKey] || 0) + 1;
    });

    let totalTierBonus = 0;
    Object.values(salesByDay).forEach(count => {
      totalTierBonus += calcDailyTierBonus(count);
    });

    const totalSalesBase = approvedSales.length * 1000; // RS 1000 per approved sale
    const totalSalesEarnings = totalSalesBase + totalTierBonus;
    // --- End sales earnings ---

    // Create notes breakdown
    const notes = `Base Salary: ${baseSalary} | Fines: ${totalFines} | Unpaid Leaves: ${leaveDeduction.toFixed(2)} (${absentDays} absent days) | Sales Earnings: ${totalSalesBase} (${approvedSales.length} approved sales) | Tier Bonus: ${totalTierBonus}`;

    // Check if salary record already exists for this month
    const existingSalary = await Salary.findOne({
      employee: employeeId,
      month: monthStart
    });

    if (existingSalary) {
      return res.status(409).json({
        success: false,
        message: 'Salary record already exists for this month',
        data: existingSalary
      });
    }

    // Create and save salary record
    const salary = await Salary.create({
      employee: employeeId,
      month: monthStart,
      baseSalary,
      bonuses: totalSalesEarnings, // approved sales base + tier bonus
      deductions: totalDeductions,
      notes
    });

    // Populate employee data in response
    await salary.populate('employee', 'firstName lastName employeeId email');

    return res.status(201).json({
      success: true,
      message: 'Salary generated successfully',
      data: {
        ...salary.toObject(),
        breakdown: {
          baseSalary,
          salesBase: totalSalesBase,
          salesTierBonus: totalTierBonus,
          totalSalesEarnings,
          approvedSalesCount: approvedSales.length,
          fines: totalFines,
          leaveDeduction,
          absentDays,
          totalDeductions,
          netPay: baseSalary + totalSalesEarnings - totalDeductions
        }
      }
    });
  } catch (error) {
    console.error('Error generating salary:', error);
    next(error);
  }
};

/**
 * Get My Salary Slips
 * Employee only - fetch their salary records with employee details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export const getMySalarySlips = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Fetch employee by userId
    const employee = await Employee.findOne({ user: userId }).select('_id');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    // Fetch salary slips for this employee, populated with employee details
    const salarySlips = await Salary.find({ employee: employee._id })
      .populate('employee', 'firstName lastName employeeId email department baseSalary')
      .sort({ month: -1 }) // Sort by date descending
      .lean();

    // Add calculated net pay to each record
    const enrichedSalarySlips = salarySlips.map(slip => ({
      ...slip,
      netPay: (slip.baseSalary || 0) + (slip.bonuses || 0) - (slip.deductions || 0)
    }));

    return res.status(200).json({
      success: true,
      data: enrichedSalarySlips,
      count: enrichedSalarySlips.length
    });
  } catch (error) {
    console.error('Error fetching salary slips:', error);
    next(error);
  }
};

/**
 * Get All Employee Salaries (Admin)
 * Admin only - fetch all salary records with filtering options
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export const getAllSalaries = async (req, res, next) => {
  try {
    const { startDate, endDate, department, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (startDate && endDate) {
      filter.month = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (department) {
      const employeesInDept = await Employee.find({ department }, '_id');
      filter.employee = { $in: employeesInDept.map(e => e._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const salaries = await Salary.find(filter)
      .populate('employee', 'firstName lastName employeeId email department')
      .sort({ month: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Salary.countDocuments(filter);

    // Add calculated net pay to each record
    const enrichedSalaries = salaries.map(slip => ({
      ...slip,
      netPay: (slip.baseSalary || 0) + (slip.bonuses || 0) - (slip.deductions || 0)
    }));

    return res.status(200).json({
      success: true,
      data: enrichedSalaries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    next(error);
  }
};

/**
 * Update Salary Record (Admin)
 * Admin only - update bonuses or other salary details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export const updateSalary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bonuses, notes } = req.body;

    // Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Salary ID is required'
      });
    }

    // Find and update salary
    const salary = await Salary.findByIdAndUpdate(
      id,
      {
        ...(bonuses !== undefined && { bonuses }),
        ...(notes && { notes })
      },
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId email department');

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    // Calculate and add net pay
    const netPay = (salary.baseSalary || 0) + (salary.bonuses || 0) - (salary.deductions || 0);

    return res.status(200).json({
      success: true,
      message: 'Salary updated successfully',
      data: {
        ...salary.toObject(),
        netPay
      }
    });
  } catch (error) {
    console.error('Error updating salary:', error);
    next(error);
  }
};

/**
 * Delete Salary Record (Admin)
 * Admin only - delete a salary record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export const deleteSalary = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Salary ID is required'
      });
    }

    const salary = await Salary.findByIdAndDelete(id);

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Salary record deleted successfully',
      data: salary
    });
  } catch (error) {
    console.error('Error deleting salary:', error);
    next(error);
  }
};

/**
 * Get Salary Summary (Admin)
 * Admin only - get salary statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export const getSalarySummary = async (req, res, next) => {
  try {
    const { year, month } = req.query;

    let filter = {};

    if (year || month) {
      const monthStart = new Date(Date.UTC(year || new Date().getFullYear(), (month || 1) - 1, 1));
      const monthEnd = new Date(Date.UTC(year || new Date().getFullYear(), (month || 1), 0, 23, 59, 59, 999));
      filter.month = { $gte: monthStart, $lte: monthEnd };
    }

    const salaries = await Salary.find(filter).lean();

    const summary = {
      totalBaseSalary: 0,
      totalBonuses: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      employeeCount: salaries.length
    };

    salaries.forEach(salary => {
      summary.totalBaseSalary += salary.baseSalary || 0;
      summary.totalBonuses += salary.bonuses || 0;
      summary.totalDeductions += salary.deductions || 0;
      summary.totalNetPay += (salary.baseSalary || 0) + (salary.bonuses || 0) - (salary.deductions || 0);
    });

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching salary summary:', error);
    next(error);
  }
};

// Get salaries for a specific employee
export const getSalariesByEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const salaries = await Salary.find({ employee: employeeId })
      .populate('employee', 'firstName lastName employeeId email')
      .sort({ month: -1 });

    if (salaries.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No salary records found for this employee'
      });
    }

    return res.status(200).json({
      success: true,
      data: salaries
    });
  } catch (error) {
    console.error('Error fetching employee salaries:', error);
    next(error);
  }
};