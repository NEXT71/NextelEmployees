import express from 'express';
import multer from 'multer';
import {
  createEmployee,
  deleteEmployee,
  deactivateEmployee,
  activateEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  getEmployeeFines,
  getEmployeeSalaries,
  getEmployeeByUserId,
  getClosers
} from '../controllers/employee.controller.js';
import {
  deleteEmployeeDocument,
  getEmployeeDocuments,
  uploadEmployeeDocuments
} from '../controllers/document.controller.js';
import auth from '../middlewares/auth.js';
import hr from '../middlewares/hr.js';
import roles from '../middlewares/roles.js';
import superadmin from '../middlewares/superadmin.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported document type'));
    }

    cb(null, true);
  }
});

const employeeRouter = express.Router();

employeeRouter.get('/closers', auth, getClosers); // Must be before /:id
employeeRouter.get('/', auth, roles('admin'), getAllEmployees);
employeeRouter.get('/:employeeId/documents', auth, hr, getEmployeeDocuments);
employeeRouter.post('/:employeeId/documents', auth, hr, upload.array('files', 10), uploadEmployeeDocuments);
employeeRouter.delete('/:employeeId/documents/:documentId', auth, hr, deleteEmployeeDocument);
employeeRouter.post('/', auth, roles('admin'), createEmployee);
employeeRouter.get('/:id', auth, getEmployee);
employeeRouter.put('/:id', auth, roles('admin'), updateEmployee);
employeeRouter.patch('/:id', auth, roles('admin'), updateEmployee); // Add PATCH support
// Soft removal (HR/admin): employee -> Inactive, login disabled, history kept
employeeRouter.patch('/:id/deactivate', auth, roles('admin'), deactivateEmployee);
employeeRouter.patch('/:id/activate', auth, roles('admin'), activateEmployee);
// Permanent deletion wipes salary/fine/attendance history: superadmin only
employeeRouter.delete('/:id', auth, superadmin, deleteEmployee);
employeeRouter.get('/user/:userId', auth, getEmployeeByUserId); // Add this route


// New endpoints for employee fines and salaries
employeeRouter.get('/:id/fines', auth, getEmployeeFines);
employeeRouter.get('/:id/salaries', auth, getEmployeeSalaries);

export default employeeRouter;