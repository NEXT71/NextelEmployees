import express from 'express'
const employeeRouter = express.Router();
import { createEmployee, deleteEmployee, getAllEmployees, getEmployee, updateEmployee } from '../controllers/employee.controller.js';
import auth from '../middlewares/auth.js';
import roles from '../middlewares/roles.js';

employeeRouter.get('/', auth, getAllEmployees);
employeeRouter.get('/:id', auth, getEmployee);
employeeRouter.post('/', auth, roles('admin'), createEmployee);
employeeRouter.put('/:id', auth, updateEmployee);
employeeRouter.delete('/:id', auth, roles('admin'), deleteEmployee);

export default employeeRouter