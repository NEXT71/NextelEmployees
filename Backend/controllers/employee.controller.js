import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Salary from '../models/Salary.js';
import Fine from '../models/Fine.js';
import Attendance from '../models/Attendance.js';
import { validateEmployee } from '../validations/employee.validation.js';
import { logAudit, logAuditDelete } from '../utils/audit.js';

const PRIVILEGED_ROLES = ['admin', 'superadmin', 'hr'];

// Privileged roles may read any employee; everyone else only their own record.
const canAccessEmployee = async (req, employeeId) => {
  if (PRIVILEGED_ROLES.includes(req.user.role)) return true;
  const userId = req.user.userId || req.user._id;
  if (!userId || !employeeId) return false;
  try {
    return !!(await Employee.exists({ _id: employeeId, user: userId }));
  } catch {
    return false; // malformed id
  }
};

const forbidden = (res) =>
  res.status(403).json({ success: false, message: 'Forbidden - Insufficient permissions' });

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
    if (!(await canAccessEmployee(req, req.params.id))) return forbidden(res);

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
        address: req.body.contact?.address || ''
      }
    };

    delete updateData.salary;

    // First, get the current employee to check for associated user
    const currentEmployee = await Employee.findById(req.params.id);
    
    if (!currentEmployee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with id ${req.params.id}`
      });
    }

    // Update the employee
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

    // Keep the login in step with the employee's status
    if (employee.user && req.body.status && req.body.status !== currentEmployee.status) {
      if (req.body.status === 'Inactive') {
        await disableUserAccount(employee.user._id);
      } else {
        await User.findByIdAndUpdate(employee.user._id, { $set: { isActive: true } });
      }
    }

    // Update the associated User model if it exists
    if (employee.user) {
      const userUpdateData = {};
      
      // Update email if changed
      if (req.body.email && req.body.email !== currentEmployee.email) {
        userUpdateData.email = req.body.email;
      }
      
      // Update username if firstName or lastName changed
      if (req.body.firstName || req.body.lastName) {
        const firstName = req.body.firstName || currentEmployee.firstName;
        const lastName = req.body.lastName || currentEmployee.lastName;
        // Generate username format: firstname.lastname
        userUpdateData.username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      }

      // Only update if there are changes
      if (Object.keys(userUpdateData).length > 0) {
        try {
          await User.findByIdAndUpdate(
            employee.user._id,
            userUpdateData,
            { 
              new: true,
              runValidators: true
            }
          );
          console.log(`✅ Updated associated user account for employee: ${employee.firstName} ${employee.lastName}`);
        } catch (userUpdateError) {
          // If there's a duplicate key error, log it but don't fail the employee update
          if (userUpdateError.code === 11000) {
            console.warn(`⚠️ Could not update user account due to duplicate: ${userUpdateError.message}`);
          } else {
            console.error('Error updating user account:', userUpdateError);
          }
        }
      }
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (err) {
    next(err);
  }
};

// Disable the login behind an employee and kill any live session.
const disableUserAccount = (userId) =>
  User.findByIdAndUpdate(userId, {
    $set: { isActive: false, isLoggedIn: false },
    $unset: { activeSessionId: 1, activeDeviceId: 1, activeSessionExpiresAt: 1 }
  });

// Soft-remove: employee becomes Inactive, login is disabled, history is kept.
const deactivateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('user', 'role');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const targetRole = employee.user?.role;
    if (employee.user && String(employee.user._id) === String(req.user.userId || req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }
    if (['admin', 'superadmin'].includes(targetRole) && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only a superadmin can deactivate an admin account' });
    }
    if (targetRole === 'superadmin') {
      return res.status(403).json({ success: false, message: 'A superadmin account cannot be deactivated' });
    }

    employee.status = 'Inactive';
    await employee.save();
    if (employee.user) await disableUserAccount(employee.user._id);

    await logAudit(req, {
      action: 'employee.deactivate',
      entityType: 'employee',
      entityId: employee._id,
      summary: `Deactivated ${employee.firstName} ${employee.lastName} (${employee.employeeId})`
    });

    res.json({ success: true, message: 'Employee deactivated; login disabled', data: employee });
  } catch (err) {
    next(err);
  }
};

const activateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    employee.status = 'Active';
    await employee.save();
    if (employee.user) await User.findByIdAndUpdate(employee.user, { $set: { isActive: true } });

    await logAudit(req, {
      action: 'employee.activate',
      entityType: 'employee',
      entityId: employee._id,
      summary: `Reactivated ${employee.firstName} ${employee.lastName} (${employee.employeeId})`
    });

    res.json({ success: true, message: 'Employee reactivated; login enabled', data: employee });
  } catch (err) {
    next(err);
  }
};

// Permanently delete employee (superadmin only - see routes)
const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with id ${req.params.id}`
      });
    }

    await logAuditDelete(req, {
      action: 'employee.delete',
      entityType: 'employee',
      entityId: employee._id,
      summary: `Permanently deleted ${employee.firstName} ${employee.lastName} (${employee.employeeId})`,
      snapshot: employee
    });

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
    if (!(await canAccessEmployee(req, req.params.id))) return forbidden(res);

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
    if (!(await canAccessEmployee(req, req.params.id))) return forbidden(res);

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

    const ownUserId = req.user.userId || req.user._id;
    if (!PRIVILEGED_ROLES.includes(req.user.role) && String(ownUserId) !== String(userId)) {
      return forbidden(res);
    }

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
  deactivateEmployee,
  activateEmployee,
  updateEmployee,
  getEmployeeFines,
  getEmployeeSalaries,
  getEmployeeByUserId,
  getClosers
};

// Get all employees with isCloser = true (for dropdown in CSR sales form)
async function getClosers(req, res, next) {
  try {
    const closers = await Employee.find({ isCloser: true, status: 'Active' })
      .select('_id firstName lastName employeeId')
      .sort({ firstName: 1 });

    res.json({ success: true, data: closers });
  } catch (err) {
    next(err);
  }
}