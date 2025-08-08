import mongoose from "mongoose";
const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  clockIn: {
    type: Date,
    required: true
  },
  clockOut: Date,
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'On Leave'],
    default: 'Present'
  },
  notes: String
}, { timestamps: true });

// Index for faster queries
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;