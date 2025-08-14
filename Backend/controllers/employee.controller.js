import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Salary from '../models/Salary.js';
import Fine from '../models/Fine.js';
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

// Get single employee with fines and salaries
const getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .select('-__v');

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

    // Prepare update data without salary
    const updateData = {
      ...req.body,
      contact: {
        phone: req.body.contact?.phone || '',
        address: req.body.contact?.address || '',
        emergencyContact: req.body.contact?.emergencyContact || ''
      }
    };

    // Remove salary from update if present
    delete updateData.salary;

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
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

    // Delete associated fines
    await Fine.deleteMany({ employee: employee._id });

    // Delete associated salaries
    await Salary.deleteMany({ employee: employee._id });

    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// Get employee fines
const getEmployeeFines = async (req, res, next) => {
  try {
    const fines = await Fine.find({ employee: req.params.id })
      .sort('-date');

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
// Get employee data by user ID (directly from User model)
const getEmployeeByUserId = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username email role employeeId')
      .populate({
        path: 'employeeId',
        select: 'firstName lastName email contact.phone position department',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id ${req.params.userId}`
      });
    }

    if (!user.employeeId) {
      return res.status(404).json({
        success: false,
        message: 'No employee record associated with this user'
      });
    }

    // Format the response
    const responseData = {
      name: `${user.employeeId.firstName} ${user.employeeId.lastName}`,
      email: user.employeeId.email || user.email,
      phone: user.employeeId.contact?.phone || '',
      position: user.employeeId.position || '',
      department: user.employeeId.department?.name || ''
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (err) {
    next(err);
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