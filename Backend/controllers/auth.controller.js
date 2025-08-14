import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { generateToken } from '../config/jwt.js';
import { validateLogin, validateUserRegister, validateEmployeeRegister } from '../validations/auth.validation.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { generateOTP } from '../services/generateOTP.js';
import crypto from 'crypto'; // Node's built-in crypto

// Regular user registration (for all users)
const register = async (req, res, next) => {
  try {
    const { error } = validateUserRegister(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false,
        message: error.details[0].message 
      });
    }

    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    }

    // Create new user (regular users are active immediately)
    const user = await User.create({
      username,
      email,
      password,
      role: 'employee', // Default role for regular registration
      isLoggedIn: false,
      isActive: true,
      verified: true
    });

    // Generate token
    const token = generateToken({ 
      userId: user._id,
      employeeId: user.employeeId, // Make sure this exists
      role: user.role 
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }
    next(err);
  }
};

const registerEmployee = async (req, res, next) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can register employees'
      });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      department, 
      position, 
      employeeId 
    } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !department || !position || !employeeId) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    // Check for existing employee
    const existingEmployee = await Employee.findOne({ 
      $or: [{ email }, { employeeId }] 
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this email or ID already exists'
      });
    }

    // Create employee (other fields will use defaults)
    const newEmployee = await Employee.create({
      firstName,
      lastName,
      email,
      department,
      position,
      employeeId,
      registeredBy: req.user._id
    });

    // Generate username for user account
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    
    // Generate password as firstName + lastName + "123" (lowercase, no spaces)
    const password = `${firstName.toLowerCase()}${lastName.toLowerCase()}123`;

    // Create corresponding user account
    const newUser = await User.create({
      username,
      email,
      password, // Using the generated password
      role: 'employee',
      employeeId: newEmployee._id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: {
        id: newEmployee._id,
        employeeId: newEmployee.employeeId,
        name: `${firstName} ${lastName}`,
        email,
        department,
        position,
        temporaryPassword: password // Send the generated password in response
      }
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate employee data detected'
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

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if account is active (only for employees)
    if (user.role === 'employee' && !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account not active. Please verify your email first.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
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

// Verify OTP and activate account
const verifyEmployeeAccount = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ 
      email,
      role: 'employee',
      verified: false 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee account not found or already verified'
      });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Activate account
    user.isActive = true;
    user.verified = true;
    user.verificationCode = null;
    await user.save();

    res.json({
      success: true,
      message: 'Account verified successfully. You can now login.'
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
// Send OTP for verification
const sendOTPForVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Account is already verified'
      });
    }

    const otp = generateOTP();
    user.verificationCode = otp;
    user.verificationCodeExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    await sendVerificationEmail(email, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Forgot password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(email, resetToken);

      res.json({
        success: true,
        message: 'Password reset token sent to email'
      });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'There was an error sending the email. Try again later.'
      });
    }
  } catch (err) {
    console.error("Forgot password error:", err); // log for debugging
    next(err);
  }
};

// Reset password
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired'
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    next(err);
  }
};
export {
  register,
  registerEmployee,
  login,
  getMe,
  logout,
  verifyEmployeeAccount,
  sendOTPForVerification,
  forgotPassword,
  resetPassword
};