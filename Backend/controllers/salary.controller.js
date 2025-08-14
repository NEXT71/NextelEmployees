import Salary from '../models/Salary.js';
import Employee from '../models/Employee.js';

// Create salary record
const createSalary = async (req, res, next) => {
  try {
    const { employeeId, month, baseSalary, bonuses, deductions, notes } = req.body;

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Create salary record
    const salary = await Salary.create({
      employee: employeeId,
      month,
      baseSalary,
      bonuses,
      deductions,
      notes
    });

    res.status(201).json({
      success: true,
      data: salary
    });
  } catch (err) {
    next(err);
  }
};

// Get all salaries for an employee
const getEmployeeSalaries = async (req, res, next) => {
  try {
    const salaries = await Salary.find({ employee: req.params.employeeId })
      .sort('-month');

    res.json({
      success: true,
      count: salaries.length,
      data: salaries
    });
  } catch (err) {
    next(err);
  }
};

// Get all salaries (admin only)
const getAllSalaries = async (req, res, next) => {
  try {
    const { startDate, endDate, department } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.month = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (department) {
      const employeesInDept = await Employee.find({ department }, '_id');
      query.employee = { $in: employeesInDept.map(e => e._id) };
    }

    const salaries = await Salary.find(query)
      .sort('-month')
      .populate('employee', 'firstName lastName employeeId department');

    res.json({
      success: true,
      count: salaries.length,
      data: salaries
    });
  } catch (err) {
    next(err);
  }
};

// Update salary record
const updateSalary = async (req, res, next) => {
  try {
    const { baseSalary, bonuses, deductions, notes } = req.body;

    const salary = await Salary.findByIdAndUpdate(
      req.params.id,
      {
        baseSalary,
        bonuses,
        deductions,
        notes
      },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId');

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    res.json({
      success: true,
      data: salary
    });
  } catch (err) {
    next(err);
  }
};

// Delete salary record
const deleteSalary = async (req, res, next) => {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

export {
  createSalary,
  getEmployeeSalaries,
  getAllSalaries,
  updateSalary,
  deleteSalary
};