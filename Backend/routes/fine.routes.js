import express from 'express';
import {
  applyFine,
  approveFine,
  getEmployeeFines,
  getFinesByEmployeeId,
  getAllFines,
  getFineSummary,
  getEmployeeSummary,
  deleteFine
} from '../controllers/fine.controller.js';
import auth from '../middlewares/auth.js';
import roles from '../middlewares/roles.js';

const fineRouter = express.Router();

fineRouter.post('/', auth, applyFine);
fineRouter.patch('/:id/approve', auth, roles('admin'), approveFine);
fineRouter.delete('/:id', auth, roles('admin'), deleteFine);
fineRouter.get('/employee', auth, getEmployeeFines); // For current authenticated employee
fineRouter.get('/employee/:employeeId', auth, roles('admin'), getFinesByEmployeeId); // For specific employee
fineRouter.get('/', auth, roles('admin'), getAllFines);
fineRouter.get('/summary', auth, roles('admin'), getFineSummary);
fineRouter.get('/employeesSummary', auth, roles('admin'), getEmployeeSummary);

export default fineRouter;