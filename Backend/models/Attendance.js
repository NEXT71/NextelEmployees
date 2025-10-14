import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true,
    get: (date) => {
      // Store dates normalized to UTC midnight
      const d = new Date(date);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
  },
  clockIn: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Half-day'],
    default: 'Absent'
  },
  autoMarked: {
    type: Boolean,
    default: false,
    description: 'Whether this record was automatically created by the system'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { getters: true }
});

// Add compound index
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance