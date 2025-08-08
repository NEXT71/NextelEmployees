import express from 'express';
import {
  applyFine,
  approveFine,
  getEmployeeFines,
  getAllFines,
  getFineSummary
} from '../controllers/fine.controller.js';
import auth from '../middlewares/auth.js';
import roles from '../middlewares/roles.js';

const fineRouter = express.Router();

// Apply fine (supervisor or admin)
fineRouter.post('/', applyFine);

// Approve fine (admin only)
fineRouter.patch('/:id/approve', auth, roles('admin'), approveFine);

// Get fines for specific employee
fineRouter.get('/employee/:employeeId', auth, getEmployeeFines);

// Get all fines (admin only)
fineRouter.get('/', auth, roles('admin'), getAllFines);

// Get fine summary (admin dashboard)
fineRouter.get('/summary', auth, roles('admin'), getFineSummary);

export default fineRouter;