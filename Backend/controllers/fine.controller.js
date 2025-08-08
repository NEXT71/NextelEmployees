import Fine from '../models/fine.js';
import Employee from '../models/Employee.js';

// Apply fine to employee
const applyFine = async (req, res, next) => {
  try {
    const { employeeId, type, description } = req.body;

    // Verify employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Create fine
    const fine = await Fine.create({
      employee: employeeId,
      type,
      description,
      approved: req.user.role === 'admin' // Auto-approve if admin
    });

    res.status(201).json({
      success: true,
      data: fine
    });
  } catch (err) {
    next(err);
  }
};

// Approve fine (admin only)
const approveFine = async (req, res, next) => {
  try {
    const fine = await Fine.findByIdAndUpdate(
      req.params.id,
      {
        approved: true,
        approvedBy: req.user.userId,
        approvedAt: new Date()
      },
      { new: true }
    );

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

// Get fines for employee
const getEmployeeFines = async (req, res, next) => {
  try {
    const fines = await Fine.find({ employee: req.params.employeeId })
      .sort('-date')
      .populate('employee', 'firstName lastName employeeId');

    res.json({
      success: true,
      count: fines.length,
      data: fines
    });
  } catch (err) {
    next(err);
  }
};

// Get all fines (admin only)
const getAllFines = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
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

// Get fine summary (admin dashboard)
const getFineSummary = async (req, res, next) => {
  try {
    const summary = await Fine.aggregate([
      {
        $match: { approved: true }
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
        $match: { approved: true }
      },
      {
        $group: {
          _id: null,
          totalFines: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byType: summary,
        overall: total[0] || { totalFines: 0, totalAmount: 0 }
      }
    });
  } catch (err) {
    next(err);
  }
};

export {applyFine, approveFine, getEmployeeFines, getFineSummary,getAllFines}