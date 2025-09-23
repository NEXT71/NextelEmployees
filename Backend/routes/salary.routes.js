import express from 'express';
import {
  createSalary,
  getEmployeeSalaries,
  getAllSalaries,
  updateSalary,
  deleteSalary
} from '../controllers/salary.controller.js';
import auth from '../middlewares/auth.js';
import roles from '../middlewares/roles.js';

const salaryRouter = express.Router();

salaryRouter.post('/', auth, roles('admin'), createSalary);
salaryRouter.get('/', auth, roles('admin'), getAllSalaries);
salaryRouter.get('/employee/:employeeId', auth, getEmployeeSalaries);
salaryRouter.put('/:id', auth, roles('admin'), updateSalary);
salaryRouter.delete('/:id', auth, roles('admin'), deleteSalary);

export default salaryRouter;