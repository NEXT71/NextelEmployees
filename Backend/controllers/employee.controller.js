import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Salary from '../models/Salary.js';
import Fine from '../models/Fine.js';
import Attendance from '../models/Attendance.js';
import { validateEmployee } from '../validations/employee.validation.js';

// Get all employees
const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.find()
      .select('-__v')
      .populate('user', 'username email role')
      .populate('department', 'name');

    console.log('Total employees found:', employees.length);
    console.log('Employees with user data:', employees.filter(e => e.user).length);
    console.log('Admin users found:', employees.filter(e => e.user && e.user.role === 'admin').length);

    // Filter out admin users from the employee list
    const filteredEmployees = employees.filter(employee => {
      // Exclude employees who have admin role
      const isAdmin = employee.user && employee.user.role === 'admin';
      if (isAdmin) {
        console.log('Filtering out admin user:', employee.email, employee.user.username);
      }
      return !isAdmin;
    });

    console.log('Filtered employees count:', filteredEmployees.length);

    res.json({
      success: true,
      count: filteredEmployees.length,
      data: filteredEmployees
    });
  } catch (err) {
    next(err);
  }
};

// Get single employee with fines and salaries
const getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .select('-__v')
      .populate('user', 'username email role')
      .populate('department', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with id ${req.params.id}`
      });
    }

    // Get employee fines
    const fines = await Fine.find({ employee: req.params.id })
      .sort('-date');

    // Get employee salaries
    const salaries = await Salary.find({ employee: req.params.id })
      .sort('-month');

    res.json({
      success: true,
      data: {
        employee,
        fines,
        salaries
      }
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
    const existingEmployee = await Employee.findOne({ 
      $or: [
        { employeeId: req.body.employeeId },
        { email: req.body.email }
      ]
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: `Employee with ID ${req.body.employeeId} or email ${req.body.email} already exists`
      });
    }

    const employee = await Employee.create({
      ...req.body,
      registeredBy: req.user._id
    });

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

    const updateData = {
      ...req.body,
      contact: {
        phone: req.body.contact?.phone || '',
        address: req.body.contact?.address || '',
        emergencyContact: req.body.contact?.emergencyContact || ''
      }
    };

    delete updateData.salary;

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true,
        runValidators: true
      }
    )
    .select('-__v')
    .populate('user', 'username email role');

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
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with id ${req.params.id}`
      });
    }

    // Find and delete associated user account by employeeId reference
    // This handles both directions of the relationship
    const associatedUser = await User.findOne({ 
      $or: [
        { employeeId: employee._id },  // User references this employee
        { _id: employee.user }         // Employee references this user
      ]
    });

    if (associatedUser) {
      await User.findByIdAndDelete(associatedUser._id);
      console.log(`✅ Deleted associated user account: ${associatedUser.username}`);
    }

    // Delete the employee record
    await Employee.findByIdAndDelete(req.params.id);

    // Delete associated records
    const [deletedFines, deletedSalaries, deletedAttendance] = await Promise.all([
      Fine.deleteMany({ employee: employee._id }),
      Salary.deleteMany({ employee: employee._id }),
      Attendance.deleteMany({ employee: employee._id })
    ]);

    console.log(`✅ Deleted employee and all associated records: ${employee.firstName} ${employee.lastName}`);
    console.log(`   - Fines deleted: ${deletedFines.deletedCount}`);
    console.log(`   - Salaries deleted: ${deletedSalaries.deletedCount}`);
    console.log(`   - Attendance records deleted: ${deletedAttendance.deletedCount}`);

    res.json({
      success: true,
      message: 'Employee and associated user account deleted successfully',
      data: {}
    });
  } catch (err) {
    console.error('Error deleting employee:', err);
    next(err);
  }
};

// Get employee fines
const getEmployeeFines = async (req, res, next) => {
  try {
    const fines = await Fine.find({ employee: req.params.id })
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

// Get employee salaries
const getEmployeeSalaries = async (req, res, next) => {
  try {
    const salaries = await Salary.find({ employee: req.params.id })
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

// Update getEmployeeByUserId to match registration structure
const getEmployeeByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find employee by user reference (as created in registerEmployee)
    const employee = await Employee.findOne({ user: userId })
      .populate('user', 'username email role')
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found for this user'
      });
    }

    // Format response to match registration structure
    const responseData = {
      ...employee,
      name: `${employee.firstName} ${employee.lastName}`,
      contact: employee.contact || {}
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('GetEmployeeByUserId Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching employee data'
    });
  }
};

export {
  getAllEmployees,
  getEmployee,
  createEmployee,
  deleteEmployee,
  updateEmployee,
  getEmployeeFines,
  getEmployeeSalaries,
  getEmployeeByUserId
};