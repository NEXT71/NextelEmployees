import Fine from '../models/Fine.js';
import Employee from '../models/Employee.js';

const FINE_TYPES = [
  { name: 'Clothing', amount: 300 },
  { name: 'Late', amount: 300 },
  { name: 'Absent', amount: 500 },
  { name: 'Performance', amount: 500 },
  { name: 'Late After Break', amount: 300 },
  { name: 'MisBehave', amount: 1000 },
  { name: 'Vape-Pod', amount: 300 },
  { name: 'Saturday Off', amount: 500 },
  { name: 'Mobile Usage/Wifi', amount: 300 },
  { name: 'Sleeping', amount: 300 }
];

const applyFine = async (req, res, next) => {
  try {
    const { employeeId, type, amount, description } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const fine = await Fine.create({
      employee: employeeId,
      type,
      amount: amount || FINE_TYPES.find(t => t.name === type)?.amount || 0,
      description,
      date: new Date(),
      approved: req.user.role === 'admin',
      approvedBy: req.user.role === 'admin' ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      data: fine
    });
  } catch (err) {
    next(err);
  }
};

const approveFine = async (req, res, next) => {
  try {
    const fine = await Fine.findByIdAndUpdate(
      req.params.id,
      {
        approved: true,
        approvedBy: req.user._id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId');

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Fine not found'
      });
    }

    res.json({
      success: true,
      data: fine
    });
  } catch (err) {
    next(err);
  }
};

// Update getEmployeeFines to match registration flow
const getEmployeeFines = async (req, res, next) => {
  try {
const userId = req.user?._id || req.user?.userId;
    
    // Find employee by user reference
    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found for this user'
      });
    }

    const fines = await Fine.find({ employee: employee._id })
      .sort('-date')
      .populate('approvedBy', 'username');

    res.json({
      success: true,
      count: fines.length,
      data: fines
    });
  } catch (err) {
    next(err);
  }
};

const getFinesByEmployeeId = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    const fines = await Fine.find({ employee: employeeId })
      .sort('-date')
      .populate('approvedBy', 'username');

    res.json({
      success: true,
      count: fines.length,
      data: fines
    });
  } catch (err) {
    next(err);
  }
};

const getAllFines = async (req, res, next) => {
  try {
    const { startDate, endDate, status, department } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) {
      query.approved = status === 'approved';
    }

    if (department) {
      const employeesInDept = await Employee.find({ department }, '_id');
      query.employee = { $in: employeesInDept.map(e => e._id) };
    }

    const fines = await Fine.find(query)
      .sort('-date')
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'username');

    res.json({
      success: true,
      count: fines.length,
      data: fines
    });
  } catch (err) {
    next(err);
  }
};

const getFineSummary = async (req, res, next) => {
  try {
    const { period } = req.query;
    const dateFilter = getDateFilter(period);

    const summary = await Fine.aggregate([
      {
        $match: { 
          approved: true,
          ...dateFilter 
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    const total = await Fine.aggregate([
      {
        $match: { 
          approved: true,
          ...dateFilter 
        }
      },
      {
        $group: {
          _id: null,
          totalFines: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayFines = await Fine.countDocuments({ 
      approved: true,
      date: { $gte: today } 
    });

    res.json({
      success: true,
      data: {
        byType: summary,
        overall: total[0] || { totalFines: 0, totalAmount: 0 },
        todayFines
      }
    });
  } catch (err) {
    next(err);
  }
};

const getEmployeeSummary = async (req, res, next) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'Active' });

    const finesAgg = await Fine.aggregate([
      { $match: { approved: true } },
      { $group: { 
          _id: null, 
          totalAmount: { $sum: '$amount' }, 
          totalCount: { $sum: 1 } 
      } }
    ]);

    const totalFineAmount = finesAgg.length > 0 ? finesAgg[0].totalAmount : 0;
    const totalFinesCount = finesAgg.length > 0 ? finesAgg[0].totalCount : 0;

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        totalFinesCount,
        totalFineAmount
      }
    });
  } catch (err) {
    next(err);
  }
};

const getDateFilter = (period) => {
  const now = new Date();
  const filter = {};

  if (!period) return filter;

  switch (period.toLowerCase()) {
    case 'day':
      filter.date = { 
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lte: new Date(now.setHours(23, 59, 59, 999))
      };
      break;
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      filter.date = { $gte: weekStart, $lte: weekEnd };
      break;
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      filter.date = { $gte: monthStart, $lte: monthEnd };
      break;
    case 'year':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      yearEnd.setHours(23, 59, 59, 999);
      
      filter.date = { $gte: yearStart, $lte: yearEnd };
      break;
  }

  return filter;
};

export {
  applyFine,
  approveFine,
  getEmployeeFines,
  getFinesByEmployeeId,
  getFineSummary,
  getAllFines,
  getEmployeeSummary
};