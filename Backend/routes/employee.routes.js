import express from 'express';
import {
  createEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  getEmployeeFines,
  getEmployeeSalaries,
  getEmployeeByUserId
} from '../controllers/employee.controller.js';
import auth from '../middlewares/auth.js';
import roles from '../middlewares/roles.js';

const employeeRouter = express.Router();

employeeRouter.get('/', auth, getAllEmployees);
employeeRouter.post('/', auth, roles('admin'), createEmployee);
employeeRouter.get('/:id', auth, getEmployee);
employeeRouter.put('/:id', auth, roles('admin'), updateEmployee);
employeeRouter.delete('/:id', auth, roles('admin'), deleteEmployee);
employeeRouter.get('/user/:userId', auth, getEmployeeByUserId); // Add this route


// New endpoints for employee fines and salaries
employeeRouter.get('/:id/fines', auth, getEmployeeFines);
employeeRouter.get('/:id/salaries', auth, getEmployeeSalaries);

export default employeeRouter;