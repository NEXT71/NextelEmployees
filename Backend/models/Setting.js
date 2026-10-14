import mongoose from 'mongoose';

// Key/value system settings edited by the superadmin. Each change bumps `version`.
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  version: { type: Number, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedByName: { type: String, default: '' }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
