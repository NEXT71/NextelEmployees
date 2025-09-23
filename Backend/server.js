import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import errorHandler from './middlewares/errorHandler.js';
import authRouter from './routes/auth.routes.js';
import employeeRouter from './routes/employee.routes.js';
import attendanceRouter from './routes/attendance.routes.js';
import fineRouter from './routes/fine.routes.js';
import messageRouter from './routes/message.routes.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Database connection
import './config/db.js';
import connectDB from './config/db.js';
import salaryRouter from './routes/salary.routes.js';

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

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Nextel Employees API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
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
      messages: '/api/messages'
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

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));