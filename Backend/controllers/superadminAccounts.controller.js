import crypto from 'crypto';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import SalesTarget from '../models/SalesTarget.js';
import Salary from '../models/Salary.js';
import Fine from '../models/Fine.js';
import Bonus from '../models/Bonus.js';
import Attendance from '../models/Attendance.js';
import Setting from '../models/Setting.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/audit.js';
import { DEFAULT_FINE_AMOUNTS, getFineAmounts, clearSettingsCache } from '../utils/settings.js';

const MANAGEABLE_ROLES = ['employee', 'qa', 'hr', 'admin'];
const MIN_PASSWORD_LENGTH = 8;
const SESSION_FIELDS = { activeSessionId: 1, activeDeviceId: 1, activeSessionExpiresAt: 1 };

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Sensitive actions re-check the acting superadmin's own password.
const verifyActorPassword = async (req, password) => {
  if (!password) return false;
  const actor = await User.findById(req.user._id);
  return !!actor && (await actor.comparePassword(String(password)));
};

const generateTempPassword = () => crypto.randomBytes(9).toString('base64url');

const endSessions = (userId) =>
  User.updateOne({ _id: userId }, { $set: { isLoggedIn: false }, $unset: SESSION_FIELDS });

// ── Create account (admin / qa / hr) ────────────────────────────────────────
export const createUserAccount = async (req, res, next) => {
  try {
    const { username, email, role, confirmPassword } = req.body;

    if (!username?.trim() || !email?.trim()) return fail(res, 400, 'Username and email are required');
    if (!['admin', 'qa', 'hr'].includes(role)) {
      return fail(res, 400, 'Only admin, qa and hr accounts can be created here. Employees are registered through HR.');
    }
    if (!(await verifyActorPassword(req, confirmPassword))) {
      return fail(res, 403, 'Your password is incorrect');
    }

    const exists = await User.findOne({
      $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }]
    }).select('_id');
    if (exists) return fail(res, 409, 'A user with this username or email already exists');

    const tempPassword = generateTempPassword();
    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: tempPassword,
      role,
      isActive: true
    });

    await logAudit(req, {
      action: 'user.create', entityType: 'user', entityId: user._id,
      summary: `Created ${role} account ${user.username}`
    });

    res.status(201).json({
      success: true,
      message: 'Account created. Share the temporary password now, it will not be shown again.',
      data: { _id: user._id, username: user.username, email: user.email, role: user.role, tempPassword }
    });
  } catch (err) {
    next(err);
  }
};

// ── Change role ─────────────────────────────────────────────────────────────
export const changeUserRole = async (req, res, next) => {
  try {
    const { role, confirmPassword, confirmText } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return fail(res, 404, 'User not found');

    if (String(target._id) === String(req.user._id)) return fail(res, 403, 'You cannot change your own role');
    if (target.role === 'superadmin') return fail(res, 403, 'A superadmin account cannot be changed here');

    const allowed = [...MANAGEABLE_ROLES, 'superadmin'];
    if (!allowed.includes(role)) return fail(res, 400, 'Invalid role');
    if (role === target.role) return fail(res, 400, `User is already ${role}`);
    if (role === 'superadmin' && confirmText !== 'SUPERADMIN') {
      return fail(res, 400, 'Type SUPERADMIN to confirm promoting a user to superadmin');
    }
    // The Employee-linked user validator only applies to the employee role
    if (role === 'employee' && !target.employeeId) {
      return fail(res, 400, 'This account has no employee record, so it cannot become an employee');
    }
    if (!(await verifyActorPassword(req, confirmPassword))) {
      return fail(res, 403, 'Your password is incorrect');
    }

    const previousRole = target.role;
    await User.updateOne({ _id: target._id }, { $set: { role } });
    await endSessions(target._id); // forces a fresh login under the new role

    await logAudit(req, {
      action: 'user.roleChange', entityType: 'user', entityId: target._id,
      summary: `Changed role of ${target.username} from ${previousRole} to ${role}`,
      meta: { from: previousRole, to: role }
    });

    res.json({ success: true, message: `Role changed to ${role}. The user has been logged out.`, data: { _id: target._id, role } });
  } catch (err) {
    next(err);
  }
};

// ── Reset password ──────────────────────────────────────────────────────────
export const resetUserPassword = async (req, res, next) => {
  try {
    const { confirmPassword } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return fail(res, 404, 'User not found');
    if (target.role === 'superadmin' && String(target._id) !== String(req.user._id)) {
      return fail(res, 403, 'You cannot reset another superadmin password');
    }
    if (!(await verifyActorPassword(req, confirmPassword))) {
      return fail(res, 403, 'Your password is incorrect');
    }

    const tempPassword = generateTempPassword();
    target.password = tempPassword; // hashed by the User pre-save hook
    await target.save();
    await endSessions(target._id);

    await logAudit(req, {
      action: 'user.passwordReset', entityType: 'user', entityId: target._id,
      summary: `Reset password for ${target.username}`
    });

    res.json({
      success: true,
      message: 'Password reset. Share the temporary password now, it will not be shown again.',
      data: { _id: target._id, tempPassword }
    });
  } catch (err) {
    next(err);
  }
};

// ── Sessions and devices ────────────────────────────────────────────────────
export const getUserSessions = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('username email role isActive isLoggedIn activeSessionExpiresAt boundDeviceId lastLogin')
      .sort({ lastLogin: -1 })
      .lean();

    const now = Date.now();
    const data = users.map((u) => ({
      _id: u._id,
      username: u.username,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      isLoggedIn: !!u.isLoggedIn,
      sessionExpiresAt: u.activeSessionExpiresAt || null,
      sessionLive: !!(u.isLoggedIn && u.activeSessionExpiresAt && new Date(u.activeSessionExpiresAt).getTime() > now),
      deviceBound: !!u.boundDeviceId, // the device id itself is not sent to the browser
      lastLogin: u.lastLogin || null
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const forceLogoutUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id).select('username role');
    if (!target) return fail(res, 404, 'User not found');

    await endSessions(target._id);
    await logAudit(req, {
      action: 'user.forceLogout', entityType: 'user', entityId: target._id,
      summary: `Forced logout of ${target.username}`
    });

    const self = String(target._id) === String(req.user._id);
    res.json({ success: true, message: self ? 'Your session has been ended. Log in again.' : `${target.username} has been logged out` });
  } catch (err) {
    next(err);
  }
};

export const unbindUserDevice = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id).select('username');
    if (!target) return fail(res, 404, 'User not found');

    await User.updateOne(
      { _id: target._id },
      { $set: { isLoggedIn: false }, $unset: { ...SESSION_FIELDS, boundDeviceId: 1 } }
    );
    await logAudit(req, {
      action: 'user.unbindDevice', entityType: 'user', entityId: target._id,
      summary: `Unbound device and ended session for ${target.username}`
    });

    res.json({ success: true, message: `${target.username} can now log in from a new device` });
  } catch (err) {
    next(err);
  }
};

// ── Restore from audit log ──────────────────────────────────────────────────
const RESTORABLE = {
  sale: SalesTarget,
  salary: Salary,
  fine: Fine,
  bonus: Bonus,
  employee: Employee
};
// Extra documents saved in meta when an employee was deleted with their history
const EMPLOYEE_META_MODELS = { salaries: Salary, sales: SalesTarget, fines: Fine, attendance: Attendance };

const planRestore = async (log) => {
  const Model = RESTORABLE[log.entityType];
  if (!Model || !log.meta?.snapshot || !/\.(delete|bulkDelete)$/.test(log.action)) return null;

  const main = Array.isArray(log.meta.snapshot) ? log.meta.snapshot : [log.meta.snapshot];
  const groups = [{ label: log.entityType, Model, docs: main }];

  if (log.entityType === 'employee') {
    for (const [key, M] of Object.entries(EMPLOYEE_META_MODELS)) {
      if (Array.isArray(log.meta[key]) && log.meta[key].length) groups.push({ label: key, Model: M, docs: log.meta[key] });
    }
  }

  for (const g of groups) {
    const ids = g.docs.map((d) => d._id).filter(Boolean);
    const existing = new Set((await g.Model.find({ _id: { $in: ids } }).select('_id').lean()).map((d) => String(d._id)));
    g.toRestore = g.docs.filter((d) => d._id && !existing.has(String(d._id)));
    g.alreadyExist = g.docs.length - g.toRestore.length;
  }
  return groups;
};

export const previewRestore = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id).lean();
    if (!log) return fail(res, 404, 'Audit entry not found');
    const groups = await planRestore(log);
    if (!groups) return fail(res, 400, 'This audit entry cannot be restored (no snapshot, or not a delete)');

    res.json({
      success: true,
      data: {
        action: log.action,
        summary: log.summary,
        willRestore: groups.map((g) => ({ type: g.label, restore: g.toRestore.length, alreadyExist: g.alreadyExist })),
        note: log.entityType === 'employee'
          ? 'The employee login account is not part of the snapshot and is not restored. Create it again from the registration screen or Users tab.'
          : null
      }
    });
  } catch (err) {
    next(err);
  }
};

export const restoreFromAudit = async (req, res, next) => {
  try {
    const { confirmPassword } = req.body;
    if (!(await verifyActorPassword(req, confirmPassword))) return fail(res, 403, 'Your password is incorrect');

    const log = await AuditLog.findById(req.params.id).lean();
    if (!log) return fail(res, 404, 'Audit entry not found');
    const groups = await planRestore(log);
    if (!groups) return fail(res, 400, 'This audit entry cannot be restored');

    // Existing documents are never overwritten; a unique-index clash is reported, not forced.
    const result = [];
    for (const g of groups) {
      let restored = 0;
      const errors = [];
      for (const doc of g.toRestore) {
        try {
          await g.Model.collection.insertOne(doc);
          restored += 1;
        } catch (err) {
          errors.push(err.code === 11000 ? `${doc._id}: conflicts with an existing record (unique field)` : `${doc._id}: ${err.message}`);
        }
      }
      result.push({ type: g.label, restored, skipped: g.alreadyExist, errors });
    }

    await logAudit(req, {
      action: `${log.entityType}.restore`, entityType: log.entityType, entityId: log.entityId,
      summary: `Restored from audit entry ${log._id} (${log.action})`,
      meta: { sourceAuditId: String(log._id), result }
    });

    res.json({ success: true, message: 'Restore finished', data: result });
  } catch (err) {
    next(err);
  }
};

// ── System settings (fine amounts) ──────────────────────────────────────────
export const getSettings = async (req, res, next) => {
  try {
    const stored = await Setting.findOne({ key: 'fineAmounts' }).lean();
    res.json({
      success: true,
      data: {
        fineAmounts: await getFineAmounts(),
        defaults: DEFAULT_FINE_AMOUNTS,
        version: stored?.version || 0,
        updatedByName: stored?.updatedByName || '',
        updatedAt: stored?.updatedAt || null
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateFineAmounts = async (req, res, next) => {
  try {
    const { fineAmounts, confirmPassword } = req.body;
    if (!fineAmounts || typeof fineAmounts !== 'object') return fail(res, 400, 'fineAmounts is required');

    const clean = {};
    for (const type of Object.keys(DEFAULT_FINE_AMOUNTS)) {
      const n = Number(fineAmounts[type]);
      if (!Number.isFinite(n) || n < 0 || n > 1000000 || !Number.isInteger(n)) {
        return fail(res, 400, `Amount for "${type}" must be a whole number between 0 and 1,000,000`);
      }
      clean[type] = n;
    }
    if (!(await verifyActorPassword(req, confirmPassword))) return fail(res, 403, 'Your password is incorrect');

    const before = await getFineAmounts();
    const existing = await Setting.findOne({ key: 'fineAmounts' });
    const version = (existing?.version || 0) + 1;
    await Setting.findOneAndUpdate(
      { key: 'fineAmounts' },
      { $set: { value: clean, version, updatedBy: req.user._id, updatedByName: req.user.username } },
      { upsert: true, new: true }
    );
    clearSettingsCache();

    await logAudit(req, {
      action: 'settings.fineAmounts', entityType: 'settings', entityId: 'fineAmounts',
      summary: `Updated fine amounts (version ${version})`,
      meta: { before, after: clean }
    });

    res.json({ success: true, message: 'Fine amounts saved. They apply to new fines only.', data: { fineAmounts: clean, version } });
  } catch (err) {
    next(err);
  }
};
