import express from 'express';
import {
  applyBonus,
  getAllBonuses,
  getMyBonuses,
  getBonusesByEmployee,
  deleteBonus
} from '../controllers/bonus.controller.js';
import auth from '../middlewares/auth.js';
import roles from '../middlewares/roles.js';

const bonusRouter = express.Router();

// Employee: own bonuses (must be before /:id routes)
bonusRouter.get('/me', auth, getMyBonuses);

// Admin / HR / superadmin
bonusRouter.post('/', auth, roles('admin'), applyBonus);
bonusRouter.get('/', auth, roles('admin'), getAllBonuses);
bonusRouter.get('/employee/:employeeId', auth, roles('admin'), getBonusesByEmployee);
bonusRouter.delete('/:id', auth, roles('admin'), deleteBonus);

export default bonusRouter;
