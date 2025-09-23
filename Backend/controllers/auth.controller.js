import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { generateToken } from '../config/jwt.js';
import { validateLogin, validateEmployeeRegister } from '../validations/auth.validation.js';
import crypto from 'crypto'; // Node's built-in crypto


const registerEmployee = async (req, res, next) => {
  console.log("📥 Incoming request body:", req.body);
  console.log("👤 Authenticated user:", req.user);

  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can register employees'
      });
    }

    // Optional: Use Joi validation first
    const { error: validationError } = validateEmployeeRegister(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.details[0].message,
        field: validationError.details[0].path[0]
      });
    }

    const { 
      firstName, 
      lastName, 
      fatherName,
      email, 
      department, 
      position, 
      employeeId,
      hireDate,
      status,
      contact,
      password // Add password field for admin to set
    } = req.body;

    // ======================
    // Comprehensive Validation (same as before)
    // ======================

    // 1. Check required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'department', 'position', 'employeeId', 'password'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        field: 'email'
      });
    }

    // 3. Validate employee ID format (alphanumeric, 6-12 characters)
    if (!/^[a-zA-Z0-9]{6,12}$/.test(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID must be 6-12 alphanumeric characters',
        field: 'employeeId'
      });
    }

    // 4. Validate names (letters and spaces only)
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(firstName)) {
      return res.status(400).json({
        success: false,
        message: 'First name can only contain letters and spaces',
        field: 'firstName'
      });
    }
    if (!nameRegex.test(lastName)) {
      return res.status(400).json({
        success: false,
        message: 'Last name can only contain letters and spaces',
        field: 'lastName'
      });
    }
    if (fatherName && !nameRegex.test(fatherName)) {
      return res.status(400).json({
        success: false,
        message: 'Father name can only contain letters and spaces',
        field: 'fatherName'
      });
    }

    // 5. Validate department and position
    if (department.length < 2 || department.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Department must be between 2-50 characters',
        field: 'department'
      });
    }
    if (position.length < 2 || position.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Position must be between 2-50 characters',
        field: 'position'
      });
    }

    // 6. Validate hire date if provided
    if (hireDate) {
      const hireDateObj = new Date(hireDate);
      if (isNaN(hireDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hire date format',
          field: 'hireDate'
        });
      }
      // Check if hire date is in the future
      if (hireDateObj > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Hire date cannot be in the future',
          field: 'hireDate'
        });
      }
    }

    // 7. Validate contact information if provided
    if (contact) {
      if (contact.phone && !/^[0-9]{10,15}$/.test(contact.phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be 10-15 digits',
          field: 'contact.phone'
        });
      }
      if (contact.address && contact.address.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Address too long (max 200 characters)',
          field: 'contact.address'
        });
      }
    }

    // 8. Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        field: 'password'
      });
    }

    if (password.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Password is too long (max 50 characters)',
        field: 'password'
      });
    }

    // Password strength validation (optional but recommended)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        field: 'password'
      });
    }

    // ======================
    // Business Logic
    // ======================

    // Check for existing employee
    const existingEmployee = await Employee.findOne({ 
      $or: [{ email }, { employeeId }] 
    });

    if (existingEmployee) {
      if (existingEmployee.status === 'Inactive') {
        const updatedEmployee = await Employee.findByIdAndUpdate(
          existingEmployee._id,
          {
            firstName,
            lastName,
            fatherName,
            department,
            position,
            hireDate,
            status: 'Active',
            contact
          },
          { new: true }
        );
        return res.status(200).json({
          success: true,
          message: 'Previously inactive employee reactivated',
          data: updatedEmployee
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Employee with this email or ID already exists',
        existingFields: {
          email: existingEmployee.email === email,
          employeeId: existingEmployee.employeeId === employeeId
        }
      });
    }

    // Create new employee without the user field initially
    const newEmployee = await Employee.create({
      firstName,
      lastName,
      fatherName,
      email,
      department,
      position,
      employeeId,
      hireDate: hireDate || Date.now(),
      status: status || 'Active',
      contact: contact || {},
      registeredBy: req.user._id
    });

    // Handle user account creation/linking
    let existingUser = await User.findOne({ email });

    if (!existingUser) {
      // Generate username (firstname.lastname)
      let username = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}`;
      
      // Check if username already exists
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        // Add random number if username exists
        const randomNum = Math.floor(Math.random() * 100);
        username = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}${randomNum}`;
      }

      // Use the admin-provided password
      existingUser = await User.create({
        username,
        email,
        password: password, // Use admin-provided password
        role: 'employee',
        employeeId: newEmployee._id,
        isActive: true,
        verified: true
      });

      console.log(`✅ New user account created - Username: ${username}, Email: ${email}`);
    } else {
      // If user exists but isn't linked to an employee
      if (existingUser.employeeId) {
        // Clean up the employee record we just created since we can't use this email
        await Employee.findByIdAndDelete(newEmployee._id);
        return res.status(400).json({
          success: false,
          message: 'This email is already associated with another employee'
        });
      }
      
      // Update existing user with new password and link to employee
      existingUser.employeeId = newEmployee._id;
      existingUser.role = 'employee';
      existingUser.password = password; // This will be hashed by the pre-save middleware
      existingUser.isActive = true;
      await existingUser.save();

      console.log(`✅ Existing user account updated - Username: ${existingUser.username}, Email: ${email}`);
    }

    // Update the employee's user field
    await Employee.findByIdAndUpdate(newEmployee._id, {
      user: existingUser._id
    });

    // Log success (don't log the password for security)
    console.log(`✅ Employee registered successfully - Name: ${firstName} ${lastName}, Email: ${email}, Username: ${existingUser.username}`);

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: {
        id: newEmployee._id,
        employeeId: newEmployee.employeeId,
        name: `${firstName} ${lastName}`,
        email,
        username: existingUser.username,
        department,
        position,
        message: 'Employee account created with admin-provided password'
      }
    });

  } catch (err) {
    console.error("Employee registration error:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      
      // Handle specific user field duplicate error (usually means database index issue)
      if (field === 'user') {
        return res.status(500).json({
          success: false,
          message: 'Database index issue detected. Please run the index fix script: npm run fix:index',
          error: 'DUPLICATE_USER_INDEX_ERROR',
          solution: 'Run: npm run fix:index'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Employee with this ${field} already exists`,
        field,
        details: err
      });
    }

    next(err);
  }
};
// User login (works for both regular users and employees)
const login = async (req, res, next) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false,
        message: error.details[0].message 
      });
    }

    const { email, password } = req.body;

    console.log(`🔍 Login attempt - Email: ${email}, Password: ${password}`); // Debug log

    // Find user by email OR username (for flexibility)
    const user = await User.findOne({ 
      $or: [
        { email: email },
        { username: email } // Allow login with username in the email field
      ]
    });
    
    if (!user) {
      console.log(`❌ User not found for email: ${email}`); // Debug log
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    console.log(`✅ User found: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`); // Debug log

    // Check if account is active (only for employees)
    if (user.role === 'employee' && !user.isActive) {
      console.log(`❌ Account not active for: ${user.email}`); // Debug log
      return res.status(401).json({
        success: false,
        message: 'Account not active. Please verify your email first.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    console.log(`🔑 Password match result: ${isMatch}`); // Debug log
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Update login status
    user.isLoggedIn = true;
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken({ 
      userId: user._id, 
      role: user.role 
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId
      }
    });
  } catch (err) {
    next(err);
  }
};


// Get current user
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -__v')
      .populate('employeeId', 'firstName lastName employeeId department');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        isLoggedIn: user.isLoggedIn
      }
    });
  } catch (err) {
    next(err);
  }
};

// Logout
const logout = async (req, res, next) => {
  try {
    // Find and update user's login status
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { isLoggedIn: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({ 
      success: true,
      message: 'Logout successful',
      data: {
        userId: user._id,
        isLoggedIn: user.isLoggedIn
      }
    });
  } catch (err) {
    next(err);
  }
};

// Add employee statistics endpoint
const getEmployeeStats = async (req, res, next) => {
  try {
    const stats = await Employee.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

export {
  registerEmployee,
  login,
  getMe,
  getEmployeeStats,
  logout,
};