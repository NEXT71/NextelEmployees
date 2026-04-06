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

// ── Sales leaderboard — CSRs sorted by approved sales count ────────────────
export const getSalesLeaderboard = async (req, res, next) => {
  try {
    const { month, year } = req.query; // optional month/year filter

    const matchFilter = { status: 'approved' };
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end   = new Date(parseInt(year), parseInt(month), 1);
      matchFilter.saleDate = { $gte: start, $lt: end };
    }

    const agg = await SalesTarget.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $ifNull: ['$agent', '$agentName'] },
          agentObjId: { $first: '$agent' },
          agentName:  { $first: '$agentName' },
          approvedSales: { $sum: 1 },
          totalEarnings: { $sum: '$pricePerSale' },
          lastSaleDate: { $max: '$saleDate' }
        }
      },
      { $sort: { approvedSales: -1 } }
    ]);

    // Populate employee details for those that have an agent ObjectId
    const populated = await Employee.populate(agg, {
      path: 'agentObjId',
      select: 'firstName lastName employeeId department'
    });

    // Also fetch pending count per agent
    const pendingAgg = await SalesTarget.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: { $ifNull: ['$agent', '$agentName'] }, pending: { $sum: 1 } } }
    ]);
    const pendingMap = {};
    pendingAgg.forEach(p => { pendingMap[String(p._id)] = p.pending; });

    const leaderboard = populated.map((row, idx) => ({
      rank: idx + 1,
      agentId: row._id,
      agentName: row.agentObjId?.firstName
        ? `${row.agentObjId.firstName} ${row.agentObjId.lastName}`
        : row.agentName || 'Unknown',
      employeeId: row.agentObjId?.employeeId || '—',
      department: row.agentObjId?.department || '—',
      approvedSales: row.approvedSales,
      pendingSales: pendingMap[String(row._id)] || 0,
      totalEarnings: row.totalEarnings,
      lastSaleDate: row.lastSaleDate
    }));

    const topPerformer = leaderboard[0] || null;

    res.json({ success: true, data: leaderboard, topPerformer });
  } catch (err) {
    next(err);
  }
};

// ── Verifier/Closer leaderboard — sorted by approved closes ────────────────
export const getCloserLeaderboard = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const matchFilter = { status: 'approved', closerRef: { $ne: null } };
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end   = new Date(parseInt(year), parseInt(month), 1);
      matchFilter.saleDate = { $gte: start, $lt: end };
    }

    const agg = await SalesTarget.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$closerRef',
          approvedCloses: { $sum: 1 },
          totalEarnings: { $sum: 100 }, // 100 RS per close
          lastCloseDate: { $max: '$saleDate' }
        }
      },
      { $sort: { approvedCloses: -1 } }
    ]);

    const populated = await Employee.populate(agg, {
      path: '_id',
      select: 'firstName lastName employeeId department'
    });

    const leaderboard = populated.map((row, idx) => ({
      rank: idx + 1,
      closerId: row._id?._id || row._id,
      closerName: row._id?.firstName
        ? `${row._id.firstName} ${row._id.lastName}`
        : 'Unknown',
      employeeId: row._id?.employeeId || '—',
      approvedCloses: row.approvedCloses,
      totalEarnings: row.approvedCloses * 100,
      lastCloseDate: row.lastCloseDate
    }));

    res.json({ success: true, data: leaderboard, topCloser: leaderboard[0] || null });
  } catch (err) {
    next(err);
  }
};

// ── Delete a single sale record ─────────────────────────────────────────────
export const deleteSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await SalesTarget.findByIdAndDelete(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.json({ success: true, message: 'Sale deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Delete a single salary record ──────────────────────────────────────────
export const deleteSalary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const salary = await Salary.findByIdAndDelete(id);
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }
    res.json({ success: true, message: 'Salary record deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Delete a single employee (+ linked user + all associated data) ──────────
export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    await Promise.all([
      Salary.deleteMany({ employee: id }),
      SalesTarget.deleteMany({ agent: id }),
      Fine.deleteMany({ employee: id }),
      employee.user ? User.findByIdAndDelete(employee.user) : Promise.resolve(),
    ]);
    await Employee.findByIdAndDelete(id);
    res.json({ success: true, message: 'Employee and all associated records deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Bulk delete sales ────────────────────────────────────────────────────────
export const bulkDeleteSales = async (req, res, next) => {
  try {
    const { ids, all } = req.body;
    let result;
    if (all === true) {
      result = await SalesTarget.deleteMany({});
    } else if (Array.isArray(ids) && ids.length > 0) {
      result = await SalesTarget.deleteMany({ _id: { $in: ids } });
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids array or all: true' });
    }
    res.json({ success: true, message: `${result.deletedCount} sale(s) deleted` });
  } catch (err) {
    next(err);
  }
};

// ── Bulk delete salaries ─────────────────────────────────────────────────────
export const bulkDeleteSalaries = async (req, res, next) => {
  try {
    const { ids, all } = req.body;
    let result;
    if (all === true) {
      result = await Salary.deleteMany({});
    } else if (Array.isArray(ids) && ids.length > 0) {
      result = await Salary.deleteMany({ _id: { $in: ids } });
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids array or all: true' });
    }
    res.json({ success: true, message: `${result.deletedCount} salary record(s) deleted` });
  } catch (err) {
    next(err);
  }
};

// ── Bulk delete employees (+ all associated data per employee) ───────────────
export const bulkDeleteEmployees = async (req, res, next) => {
  try {
    const { ids, all } = req.body;
    let employeesToDelete;
    if (all === true) {
      employeesToDelete = await Employee.find({}).select('_id user');
    } else if (Array.isArray(ids) && ids.length > 0) {
      employeesToDelete = await Employee.find({ _id: { $in: ids } }).select('_id user');
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids array or all: true' });
    }
    const empIds = employeesToDelete.map(e => e._id);
    const userIds = employeesToDelete.map(e => e.user).filter(Boolean);
    await Promise.all([
      Employee.deleteMany({ _id: { $in: empIds } }),
      User.deleteMany({ _id: { $in: userIds } }),
      Salary.deleteMany({ employee: { $in: empIds } }),
      SalesTarget.deleteMany({ agent: { $in: empIds } }),
      Fine.deleteMany({ employee: { $in: empIds } }),
    ]);
    res.json({ success: true, message: `${empIds.length} employee(s) and all associated records deleted` });
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
