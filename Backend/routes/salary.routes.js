import express from 'express';
import {
  generateMonthlySalary,
  getMySalarySlips,
  getAllSalaries,
  updateSalary,
  deleteSalary,
  getSalarySummary
} from '../controllers/salary.controller.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';

const salaryRouter = express.Router();

// Employee routes
salaryRouter.get('/my-slips', auth, getMySalarySlips);

// Admin routes
salaryRouter.post('/generate', auth, admin, generateMonthlySalary);
salaryRouter.get('/all', auth, admin, getAllSalaries);
salaryRouter.get('/summary', auth, admin, getSalarySummary);
salaryRouter.put('/:id', auth, admin, updateSalary);
salaryRouter.delete('/:id', auth, admin, deleteSalary);

export default salaryRouter;