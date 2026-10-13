import mongoose from 'mongoose';
import Bonus, { BONUS_TYPES } from '../models/Bonus.js';
import Employee from '../models/Employee.js';
import { logAudit, logAuditDelete } from '../utils/audit.js';

const MAX_LIST = 1000;

// Give a bonus to one employee (admin, HR, superadmin)
export const applyBonus = async (req, res, next) => {
  try {
    const { employeeId, type, amount, description, date } = req.body;

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ success: false, message: 'A valid employeeId is required' });
    }
    if (!BONUS_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${BONUS_TYPES.join(', ')}` });
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be a number greater than 0' });
    }
    let bonusDate = new Date();
    if (date) {
      bonusDate = new Date(date);
      if (Number.isNaN(bonusDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date' });
      }
    }

    const employee = await Employee.findById(employeeId).select('firstName lastName employeeId status');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const bonus = await Bonus.create({
      employee: employee._id,
      type,
      amount: amountNum,
      date: bonusDate,
      description: description || '',
      createdBy: req.user._id
    });

    await logAudit(req, {
      action: 'bonus.apply',
      entityType: 'bonus',
      entityId: bonus._id,
      summary: `Bonus ${type} RS ${amountNum} to ${employee.firstName} ${employee.lastName} (${employee.employeeId})`
    });

    await bonus.populate('employee', 'firstName lastName employeeId department');
    res.status(201).json({ success: true, data: bonus });
  } catch (err) {
    next(err);
  }
};

// List bonuses with optional filters (admin, HR, superadmin)
export const getAllBonuses = async (req, res, next) => {
  try {
    const { month, startDate, endDate, employeeId, type } = req.query;
    const filter = {};

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ success: false, message: 'Invalid employeeId' });
      }
      filter.employee = employeeId;
    }
    if (type) filter.type = type;

    if (month) {
      const match = /^(\d{4})-(\d{2})$/.exec(month);
      if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
        return res.status(400).json({ success: false, message: 'month must be YYYY-MM' });
      }
      const year = Number(match[1]);
      const mon = Number(match[2]);
      filter.date = { $gte: new Date(Date.UTC(year, mon - 1, 1)), $lt: new Date(Date.UTC(year, mon, 1)) };
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const bonuses = await Bonus.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('createdBy', 'username')
      .sort({ date: -1 })
      .limit(MAX_LIST);

    res.json({ success: true, count: bonuses.length, data: bonuses });
  } catch (err) {
    next(err);
  }
};

// The logged-in employee's own bonuses
export const getMyBonuses = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const employee = await Employee.findOne({ user: userId }).select('_id');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found for this user' });
    }

    const bonuses = await Bonus.find({ employee: employee._id })
      .populate('createdBy', 'username')
      .sort({ date: -1 });

    res.json({ success: true, count: bonuses.length, data: bonuses });
  } catch (err) {
    next(err);
  }
};

// Bonuses for one employee (admin, HR, superadmin)
export const getBonusesByEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ success: false, message: 'Invalid employeeId' });
    }

    const bonuses = await Bonus.find({ employee: employeeId })
      .populate('createdBy', 'username')
      .sort({ date: -1 });

    res.json({ success: true, count: bonuses.length, data: bonuses });
  } catch (err) {
    next(err);
  }
};

// Delete a bonus (admin, HR, superadmin). Snapshot is kept in the audit log.
export const deleteBonus = async (req, res, next) => {
  try {
    const bonus = await Bonus.findByIdAndDelete(req.params.id);
    if (!bonus) {
      return res.status(404).json({ success: false, message: 'Bonus not found' });
    }

    await logAuditDelete(req, {
      action: 'bonus.delete',
      entityType: 'bonus',
      entityId: bonus._id,
      summary: `Deleted bonus ${bonus._id} (${bonus.type}, RS ${bonus.amount})`,
      snapshot: bonus
    });

    res.json({ success: true, message: 'Bonus deleted successfully' });
  } catch (err) {
    next(err);
  }
};
