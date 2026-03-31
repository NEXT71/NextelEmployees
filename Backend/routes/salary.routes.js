import express from 'express';
import {
  generateMonthlySalary,
  getMySalarySlips,
  getAllSalaries,
  updateSalary,
  deleteSalary,
  getSalarySummary,
  getSalariesByEmployee
} from '../controllers/salary.controller.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';

const salaryRouter = express.Router();

// Employee routes
salaryRouter.get('/my-slips', auth, getMySalarySlips);

// Admin routes - specific paths BEFORE dynamic :id
salaryRouter.post('/generate', auth, admin, generateMonthlySalary);
salaryRouter.get('/all', auth, admin, getAllSalaries);
salaryRouter.get('/summary', auth, admin, getSalarySummary);
salaryRouter.get('/employee/:employeeId', auth, admin, getSalariesByEmployee);

// Dynamic routes - must come LAST
salaryRouter.put('/:id', auth, admin, updateSalary);
salaryRouter.delete('/:id', auth, admin, deleteSalary);

export default salaryRouter;