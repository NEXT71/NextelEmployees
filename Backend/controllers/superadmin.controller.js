import User from '../models/User.js';
import Employee from '../models/Employee.js';
import SalesTarget from '../models/SalesTarget.js';
import Salary from '../models/Salary.js';
import Fine from '../models/Fine.js';
import Attendance from '../models/Attendance.js';
import Message from '../models/Message.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit, logAuditDelete } from '../utils/audit.js';
import { getSalesShiftDate, getSalesShiftRange } from '../utils/salesShift.js';
import { BASE_PER_SALE, CLOSER_RATE_PER_CLOSE, calcTierBonus, calcDailyEarning, getDailyTier } from '../utils/payRules.js';

const recalculateSaleBonuses = async (agentId, saleDate) => {
  if (!agentId || !saleDate) return;

  const shiftDate = getSalesShiftDate(saleDate);
  const shiftRange = getSalesShiftRange(shiftDate);
  if (!shiftRange) return;

  const dailySalesCount = await SalesTarget.countDocuments({
    agent: agentId,
    status: 'approved',
    createdAt: {
      $gte: shiftRange.start,
      $lt: shiftRange.end
    }
  });

  const { tier: achievedTier, bonus: tierBonus } = getDailyTier(dailySalesCount);

  await SalesTarget.updateMany(
    {
      agent: agentId,
      status: 'approved',
      createdAt: {
        $gte: shiftRange.start,
        $lt: shiftRange.end
      }
    },
    {
      achievedTier,
      tierBonus,
      totalEarning: Math.round(calcDailyEarning(dailySalesCount))
    }
  );
};

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

    // Deactivating must end any live session immediately
    if (!user.isActive) {
      await User.updateOne(
        { _id: user._id },
        { $set: { isLoggedIn: false }, $unset: { activeSessionId: 1, activeDeviceId: 1, activeSessionExpiresAt: 1 } }
      );
    }

    await logAudit(req, {
      action: user.isActive ? 'user.activate' : 'user.deactivate',
      entityType: 'user',
      entityId: user._id,
      summary: `${user.isActive ? 'Activated' : 'Deactivated'} user ${user.username} (${user.role})`
    });

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
      const shiftDate = getSalesShiftDate(sale.createdAt || sale.saleDate);
      const key = shiftDate ? shiftDate.slice(0, 7) : null;
      if (!key) return;
      if (!salesByMonth[key]) {
        salesByMonth[key] = { month: key, approved: 0, pending: 0, disapproved: 0, earnings: 0, sales: [] };
      }
      salesByMonth[key].sales.push(sale);
      if (sale.status === 'approved') {
        salesByMonth[key].approved++;
        salesByMonth[key].earnings += sale.pricePerSale || BASE_PER_SALE;
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
        const day = getSalesShiftDate(sale.createdAt || sale.saleDate);
        if (!day) return;
        byDay[day] = (byDay[day] || 0) + 1;
      });
      let tierBonus = 0;
      Object.values(byDay).forEach(count => {
        tierBonus += calcTierBonus(count);
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

// ── Update a single sale record ─────────────────────────────────────────────
export const updateSale = async (req, res, next) => {
  try {
    const sale = await SalesTarget.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const previousAgent = sale.agent;
    const previousSaleDate = sale.saleDate;
    const previousStatus = sale.status;
    const before = sale.toObject();

    const {
      agent,
      agentName,
      customer,
      dids,
      closer,
      closerRef,
      saleDate,
      status,
      pricePerSale,
      baseSalary
    } = req.body;

    if (agent !== undefined) sale.agent = agent || null;
    if (agentName !== undefined) sale.agentName = agentName;
    if (customer !== undefined) sale.customer = customer;
    if (dids !== undefined) sale.dids = dids;
    if (closer !== undefined) sale.closer = closer;
    if (closerRef !== undefined) sale.closerRef = closerRef || null;
    if (saleDate !== undefined) sale.saleDate = saleDate;
    if (pricePerSale !== undefined) sale.pricePerSale = pricePerSale;
    if (baseSalary !== undefined) sale.baseSalary = baseSalary;

    if (status && ['pending', 'approved', 'disapproved'].includes(status)) {
      sale.status = status;
      if (status === 'approved') {
        sale.approvedBy = req.user._id;
        sale.approvedAt = new Date();
        sale.disapprovedBy = null;
        sale.disapprovedAt = null;
        sale.rejectionReason = '';
      } else if (status === 'disapproved') {
        sale.disapprovedBy = req.user._id;
        sale.disapprovedAt = new Date();
        sale.approvedBy = null;
        sale.approvedAt = null;
      } else {
        sale.approvedBy = null;
        sale.approvedAt = null;
        sale.disapprovedBy = null;
        sale.disapprovedAt = null;
        sale.rejectionReason = '';
      }
    }

    await sale.save();

    await logAudit(req, {
      action: 'sale.update',
      entityType: 'sale',
      entityId: sale._id,
      summary: `Edited sale ${sale._id} (${previousStatus} -> ${sale.status})`,
      meta: { before, changes: req.body }
    });

    const nextAgent = sale.agent;
    const nextSaleDate = sale.saleDate;
    const shouldRecalculate = previousStatus === 'approved' || sale.status === 'approved';

    if (shouldRecalculate) {
      if (previousAgent && previousSaleDate) {
        await recalculateSaleBonuses(previousAgent, previousSaleDate);
      }
      if (
        String(previousAgent || '') !== String(nextAgent || '') ||
        new Date(previousSaleDate).getTime() !== new Date(nextSaleDate).getTime() ||
        previousStatus !== sale.status
      ) {
        await recalculateSaleBonuses(nextAgent, nextSaleDate);
      }
    }

    const updatedSale = await SalesTarget.findById(sale._id)
      .populate('agent', 'firstName lastName employeeId department')
      .populate('approvedBy', 'username')
      .populate('disapprovedBy', 'username');

    res.json({ success: true, data: updatedSale });
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

// ── Update a single salary record ───────────────────────────────────────────
export const updateSalary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month, baseSalary, bonuses, deductions, notes } = req.body;

    const before = await Salary.findById(id).lean();
    const salary = await Salary.findByIdAndUpdate(
      id,
      {
        ...(month !== undefined && { month }),
        ...(baseSalary !== undefined && { baseSalary }),
        ...(bonuses !== undefined && { bonuses }),
        ...(deductions !== undefined && { deductions }),
        ...(notes !== undefined && { notes })
      },
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId department');

    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    await logAudit(req, {
      action: 'salary.update', entityType: 'salary', entityId: salary._id,
      summary: `Edited salary record ${salary._id}`, meta: { before, changes: req.body }
    });

    res.json({
      success: true,
      data: {
        ...salary.toObject(),
        netPay: (salary.baseSalary || 0) + (salary.bonuses || 0) - (salary.deductions || 0)
      }
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
          totalEarnings: { $sum: CLOSER_RATE_PER_CLOSE },
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
      totalEarnings: row.approvedCloses * CLOSER_RATE_PER_CLOSE,
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
    await logAuditDelete(req, {
      action: 'sale.delete', entityType: 'sale', entityId: sale._id,
      summary: `Deleted sale ${sale._id} (${sale.agentName}, ${sale.status})`, snapshot: sale
    });
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
    await logAuditDelete(req, {
      action: 'salary.delete', entityType: 'salary', entityId: salary._id,
      summary: `Deleted salary record ${salary._id}`, snapshot: salary
    });
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
    const [salaries, sales, fines, attendance] = await Promise.all([
      Salary.find({ employee: id }).lean(),
      SalesTarget.find({ agent: id }).lean(),
      Fine.find({ employee: id }).lean(),
      Attendance.find({ employee: id }).lean()
    ]);
    await logAuditDelete(req, {
      action: 'employee.delete', entityType: 'employee', entityId: employee._id,
      summary: `Permanently deleted ${employee.firstName} ${employee.lastName} (${employee.employeeId}) with ${salaries.length} salaries, ${sales.length} sales, ${fines.length} fines, ${attendance.length} attendance records`,
      snapshot: employee,
      meta: { salaries, sales, fines, attendance }
    });
    await Promise.all([
      Salary.deleteMany({ employee: id }),
      SalesTarget.deleteMany({ agent: id }),
      Fine.deleteMany({ employee: id }),
      Attendance.deleteMany({ employee: id }),
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
    let filter;
    if (all === true) {
      filter = {};
    } else if (Array.isArray(ids) && ids.length > 0) {
      filter = { _id: { $in: ids } };
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids array or all: true' });
    }
    const snapshot = await SalesTarget.find(filter).lean();
    await logAuditDelete(req, {
      action: 'sale.bulkDelete', entityType: 'sale', entityId: '',
      summary: `Bulk deleted ${snapshot.length} sale(s)${all === true ? ' (ALL)' : ''}`, snapshot
    });
    result = await SalesTarget.deleteMany(filter);
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
    let filter;
    if (all === true) {
      filter = {};
    } else if (Array.isArray(ids) && ids.length > 0) {
      filter = { _id: { $in: ids } };
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids array or all: true' });
    }
    const snapshot = await Salary.find(filter).lean();
    await logAuditDelete(req, {
      action: 'salary.bulkDelete', entityType: 'salary', entityId: '',
      summary: `Bulk deleted ${snapshot.length} salary record(s)${all === true ? ' (ALL)' : ''}`, snapshot
    });
    result = await Salary.deleteMany(filter);
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
    const [empDocs, salaries, sales, fines, attendance] = await Promise.all([
      Employee.find({ _id: { $in: empIds } }).lean(),
      Salary.find({ employee: { $in: empIds } }).lean(),
      SalesTarget.find({ agent: { $in: empIds } }).lean(),
      Fine.find({ employee: { $in: empIds } }).lean(),
      Attendance.find({ employee: { $in: empIds } }).lean()
    ]);
    await logAuditDelete(req, {
      action: 'employee.bulkDelete', entityType: 'employee', entityId: '',
      summary: `Bulk deleted ${empIds.length} employee(s)${all === true ? ' (ALL)' : ''} with ${salaries.length} salaries, ${sales.length} sales, ${fines.length} fines, ${attendance.length} attendance records`,
      snapshot: empDocs,
      meta: { salaries, sales, fines, attendance }
    });
    await Promise.all([
      Employee.deleteMany({ _id: { $in: empIds } }),
      User.deleteMany({ _id: { $in: userIds } }),
      Salary.deleteMany({ employee: { $in: empIds } }),
      SalesTarget.deleteMany({ agent: { $in: empIds } }),
      Fine.deleteMany({ employee: { $in: empIds } }),
      Attendance.deleteMany({ employee: { $in: empIds } }),
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

// ── All fines ───────────────────────────────────────────────────────────────
export const getAllFines = async (req, res, next) => {
  try {
    const { status } = req.query; // 'approved' | 'pending' | undefined
    const filter = {};
    if (status === 'approved') filter.approved = true;
    if (status === 'pending')  filter.approved = false;

    const fines = await Fine.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: fines });
  } catch (err) {
    next(err);
  }
};

export const approveFine = async (req, res, next) => {
  try {
    const fine = await Fine.findByIdAndUpdate(
      req.params.id,
      { approved: true, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId');
    if (!fine) return res.status(404).json({ success: false, message: 'Fine not found' });
    await logAudit(req, { action: 'fine.approve', entityType: 'fine', entityId: fine._id, summary: `Approved fine ${fine._id}` });
    res.json({ success: true, data: fine });
  } catch (err) {
    next(err);
  }
};

export const deleteFine = async (req, res, next) => {
  try {
    const fine = await Fine.findByIdAndDelete(req.params.id);
    if (!fine) return res.status(404).json({ success: false, message: 'Fine not found' });
    await logAuditDelete(req, { action: 'fine.delete', entityType: 'fine', entityId: fine._id, summary: `Deleted fine ${fine._id}`, snapshot: fine });
    res.json({ success: true, message: 'Fine deleted' });
  } catch (err) {
    next(err);
  }
};

// ── All attendance ──────────────────────────────────────────────────────────
export const getAllAttendance = async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter = {};
    if (date) {
      const d = new Date(date);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }

    const records = await Attendance.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ date: -1, 'employee.firstName': 1 })
      .limit(300);

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

export const updateAttendance = async (req, res, next) => {
  try {
    const { status, notes, clockIn, clockOut } = req.body;
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(notes !== undefined && { notes }), ...(clockIn && { clockIn }), ...(clockOut && { clockOut }) },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// ── Audit log ───────────────────────────────────────────────────────────────
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entityType, entityId, actor, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = String(entityId);
    if (actor) filter.actor = actor;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));

    // Snapshots can be large; omit them from the list view
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .select('-meta.snapshot')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    next(err);
  }
};

// One entry including its snapshot (for recovering deleted data)
export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id).lean();
    if (!log) return res.status(404).json({ success: false, message: 'Audit entry not found' });
    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

// ── All messages ────────────────────────────────────────────────────────────
export const getAllMessages = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const messages = await Message.find(filter)
      .populate('from', 'username email role')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};

export const respondToMessage = async (req, res, next) => {
  try {
    const { message: replyText } = req.body;
    if (!replyText) return res.status(400).json({ success: false, message: 'Reply text is required' });

    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      {
        status: 'responded',
        adminResponse: { message: replyText, respondedBy: req.user._id, respondedAt: new Date() }
      },
      { new: true }
    ).populate('from', 'username email');
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (err) {
    next(err);
  }
};

export const resolveMessage = async (req, res, next) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (err) {
    next(err);
  }
};
