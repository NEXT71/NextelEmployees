import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { validateEmployee } from '../validations/employee.validation.js';

// Get all employees
 const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.find().select('-__v');
    res.json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (err) {
    next(err);
  }
};

// Get single employee
 const getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .select('-__v')
      .populate('department', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with id ${req.params.id}`
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (err) {
    next(err);
  }
};

// Create employee (admin only)
 const createEmployee = async (req, res, next) => {
  try {
    const { error } = validateEmployee(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check if employee ID already exists
    const existingEmployee = await Employee.findOne({ employeeId: req.body.employeeId });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: `Employee with ID ${req.body.employeeId} already exists`
      });
    }

    const employee = await Employee.create(req.body);

    res.status(201).json({
      success: true,
      data: employee
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field value entered'
      });
    }
    next(err);
  }
};

// Update employee
 const updateEmployee = async (req, res, next) => {
  try {
    const { error } = validateEmployee(req.body, true);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true,
        runValidators: true
      }
    ).select('-__v');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with id ${req.params.id}`
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (err) {
    next(err);
  }
};

// Delete employee
 const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with id ${req.params.id}`
      });
    }

    // Delete associated user account if exists
    await User.findOneAndDelete({ employeeRef: employee._id });

    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

export {getAllEmployees, getEmployee, createEmployee, deleteEmployee, updateEmployee}