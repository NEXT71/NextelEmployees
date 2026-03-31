import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: Date,
    required: true,
    default: Date.now
  },
  baseSalary: {
    type: Number,
    required: true
  },
  bonuses: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// Add indexes for optimal query performance
salarySchema.index({ employee: 1, month: -1 }); // For employee salary history
salarySchema.index({ month: 1 }); // For monthly reports
salarySchema.index({ createdAt: -1 }); // For recent salary records
salarySchema.index({ employee: 1, createdAt: -1 }); // For employee creation time sorting
salarySchema.index({ baseSalary: 1 }); // For salary range queries

const Salary = mongoose.model('Salary', salarySchema);
export default Salary;