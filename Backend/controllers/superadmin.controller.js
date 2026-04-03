import User from '../models/User.js';
import Employee from '../models/Employee.js';
import SalesTarget from '../models/SalesTarget.js';
import Salary from '../models/Salary.js';
import Fine from '../models/Fine.js';

// ── All users (admins + employees) ─────────────────────────────────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('employeeId', 'firstName lastName employeeId department hireDate status')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

// ── Toggle any user's active status ────────────────────────────────────────
export const toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deactivating another superadmin
    if (user.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate a Super Admin' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { _id: user._id, isActive: user.isActive, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

// ── All employees with their linked user details ────────────────────────────
export const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.find({})
      .populate('user', 'username email role isActive lastLogin')
      .sort({ hireDate: -1 });

    res.json({ success: true, data: employees });
  } catch (err) {
    next(err);
  }
};

// ── Full history for one employee (salary + sales every month since hire) ───
export const getEmployeeFullHistory = async (req, res, next) => {
  try {
    const { id } = req.params; // employee._id

    const employee = await Employee.findById(id)
      .populate('user', 'username email role isActive lastLogin');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Fetch ALL salary records for this employee
    const salaryRecords = await Salary.find({ employee: id })
      .sort({ month: -1 });

    // Fetch ALL sales submissions for this employee
    const salesRecords = await SalesTarget.find({ agent: id })
      .populate('approvedBy', 'username')
      .populate('disapprovedBy', 'username')
      .sort({ saleDate: -1 });

    // Group sales by month
    const salesByMonth = {};
    salesRecords.forEach(sale => {
      const d = new Date(sale.saleDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!salesByMonth[key]) {
        salesByMonth[key] = { month: key, approved: 0, pending: 0, disapproved: 0, earnings: 0, sales: [] };
      }
      salesByMonth[key].sales.push(sale);
      if (sale.status === 'approved') {
        salesByMonth[key].approved++;
        salesByMonth[key].earnings += sale.pricePerSale || 1000;
      } else if (sale.status === 'pending') {
        salesByMonth[key].pending++;
      } else if (sale.status === 'disapproved') {
        salesByMonth[key].disapproved++;
      }
    });

    // Add daily tier bonus to each month's earnings
    Object.values(salesByMonth).forEach(monthData => {
      const approvedSales = monthData.sales.filter(s => s.status === 'approved');
      const byDay = {};
      approvedSales.forEach(sale => {
        const day = new Date(sale.saleDate).toDateString();
        byDay[day] = (byDay[day] || 0) + 1;
      });
      let tierBonus = 0;
      Object.values(byDay).forEach(count => {
        if (count >= 12) tierBonus += 5000;
        else if (count >= 8) tierBonus += 3000;
        else if (count >= 5) tierBonus += 1000;
        else if (count >= 3) tierBonus += 500;
      });
      monthData.tierBonus = tierBonus;
      monthData.totalEarnings = monthData.earnings + tierBonus;
    });

    res.json({
      success: true,
      data: {
        employee,
        salaryHistory: salaryRecords,
        salesByMonth: Object.values(salesByMonth).sort((a, b) => b.month.localeCompare(a.month)),
        allSales: salesRecords
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── All sales submissions across all agents ─────────────────────────────────
export const getAllSalesSubmissions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [sales, total] = await Promise.all([
      SalesTarget.find(filter)
        .populate('agent', 'firstName lastName employeeId department')
        .populate('approvedBy', 'username')
        .populate('disapprovedBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SalesTarget.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    next(err);
  }
};

// ── All salary records ──────────────────────────────────────────────────────
export const getAllSalaries = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [salaries, total] = await Promise.all([
      Salary.find({})
        .populate('employee', 'firstName lastName employeeId department')
        .sort({ month: -1 })
        .skip(skip)
        .limit(limitNum),
      Salary.countDocuments()
    ]);

    const enriched = salaries.map(s => ({
      ...s.toObject(),
      netPay: (s.baseSalary || 0) + (s.bonuses || 0) - (s.deductions || 0)
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    next(err);
  }
};

// ── Dashboard summary stats ─────────────────────────────────────────────────
export const getSuperAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalEmployees,
      totalSales,
      pendingSales,
      approvedSales,
      totalSalaryRecords
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'employee' }),
      SalesTarget.countDocuments({}),
      SalesTarget.countDocuments({ status: 'pending' }),
      SalesTarget.countDocuments({ status: 'approved' }),
      Salary.countDocuments({})
    ]);

    // Total approved earnings
    const earningsAgg = await SalesTarget.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$pricePerSale' } } }
    ]);
    const totalEarningsPaid = earningsAgg[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalAdmins,
        totalEmployees,
        totalSales,
        pendingSales,
        approvedSales,
        totalSalaryRecords,
        totalEarningsPaid
      }
    });
  } catch (err) {
    next(err);
  }
};
