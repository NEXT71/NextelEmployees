import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import errorHandler from './middlewares/errorHandler.js';
import { ipRestriction } from './middlewares/ipRestriction.js';
import authRouter from './routes/auth.routes.js';
import employeeRouter from './routes/employee.routes.js';
import attendanceRouter from './routes/attendance.routes.js';
import fineRouter from './routes/fine.routes.js';
import salaryRouter from './routes/salary.routes.js';
import messageRouter from './routes/message.routes.js';
import salesTargetRouter from './routes/salesTarget.routes.js';
import salesSubmissionRouter from './routes/salesSubmission.routes.js';
import superadminRouter from './routes/superadmin.routes.js';
import { initializeCache, closeCache } from './utils/cache.js';
import { ensureArchiveCollections } from './utils/archive.js';
import { scheduleArchiveJobs } from './jobs/archiveJobs.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Trust proxy for rate limiting (required for cloud deployments like Render)
app.set('trust proxy', 1);

// IP Restriction middleware - must be applied early
app.use(ipRestriction);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// General Rate limiting for all API routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Skip rate limiting for attendance endpoints (they have their own limiter)
    return req.path.includes('/attendance/');
  }
});

// Specialized Rate limiting for attendance endpoints (clock in/out during peak times)
// Handles 30-40 concurrent agents clocking in simultaneously
const attendanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Allow up to 300 requests per 15 minutes per IP
  message: {
    error: 'Too many attendance requests. Please wait before trying again.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Prefer user ID for rate limiting, fallback to IP for unauthenticated requests
    return req.user?._id?.toString() || req.ip;
  }
});

app.use('/api/', limiter);
app.use('/api/attendance/', attendanceLimiter);

// Compression middleware for response compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses > 1KB
}));

// Database connection with optimizations
import './config/db.js';
import connectDB from './config/db.js';
import { scheduleAttendanceJobs } from './jobs/attendanceJobs.js';

connectDB();
// Middlewares
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'https://nextel-employees.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check route - must respond quickly for Render deployment
app.get('/health', (req, res) => {
  try {
    // Check database connection state
    const dbConnected = mongoose.connection.readyState === 1; // 1 = connected
    
    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? 'OK' : 'DEGRADED',
      message: 'Nextel Employees API',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      database: dbConnected ? 'Connected' : 'Connecting...',
      dbState: mongoose.connection.readyState
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Basic API info route
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Nextel Employees Management API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      employees: '/api/employees',
      attendance: '/api/attendance',
      fines: '/api/fines',
      salaries: '/api/salaries',
      messages: '/api/messages',
      'sales-targets': '/api/sales-targets',
      'sales-submissions': '/api/sales-submissions'
    }
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/fines', fineRouter);
app.use('/api/salaries', salaryRouter);
app.use('/api/messages', messageRouter);
app.use('/api/sales-targets', salesTargetRouter);
app.use('/api/sales-submissions', salesSubmissionRouter);
app.use('/api/superadmin', superadminRouter);

// Error handling
app.use(errorHandler);

// Initialize scheduled jobs
scheduleAttendanceJobs();

// Initialize cache (with graceful fallback if Redis unavailable)
initializeCache()
  .then(connected => {
    if (connected) {
      console.log('✅ Redis cache initialized');
    } else {
      console.warn('⚠️  Redis cache unavailable - running without caching');
    }
  })
  .catch(err => console.warn('Cache initialization warning:', err));

// Initialize archive collections and scheduling
ensureArchiveCollections()
  .then(() => {
    console.log('✅ Archive system initialized');
    scheduleArchiveJobs(); // Schedule daily archive operations
  })
  .catch(err => console.warn('Archive initialization warning:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('✅ Automated attendance system initialized');
});