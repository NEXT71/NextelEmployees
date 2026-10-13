import mongoose from 'mongoose';

export const BONUS_TYPES = ['Performance', 'Attendance', 'Incentive', 'Referral', 'Festival', 'Other'];

const bonusSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  type: {
    type: String,
    enum: BONUS_TYPES,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Bonus amount must be greater than 0']
  },
  // The date decides which month's salary the bonus is paid in
  date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

bonusSchema.index({ employee: 1, date: -1 });
bonusSchema.index({ date: -1 });
bonusSchema.index({ type: 1 });

const Bonus = mongoose.model('Bonus', bonusSchema);
export default Bonus;
