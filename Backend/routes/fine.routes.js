import express from 'express';
import {
  applyFine,
  approveFine,
  getEmployeeFines,
  getAllFines,
  getFineSummary,
  getEmployeeSummary
} from '../controllers/fine.controller.js';
import auth from '../middlewares/auth.js';
import roles from '../middlewares/roles.js';

const fineRouter = express.Router();

fineRouter.post('/', auth, applyFine);
fineRouter.patch('/:id/approve', auth, roles('admin'), approveFine);
fineRouter.get('/employee', auth, getEmployeeFines); // Changed route to not require employeeId
fineRouter.get('/', auth, roles('admin'), getAllFines);
fineRouter.get('/summary', auth, roles('admin'), getFineSummary);
fineRouter.get('/employeesSummary', auth, roles('admin'), getEmployeeSummary);

export default fineRouter;