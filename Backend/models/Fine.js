import mongoose from 'mongoose';

const fineSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  type: {
    type: String,
    enum: [
      'Clothing',
      'Late',
      'Absent',
      'Performance',
      'Late After Break',
      'MisBehave',
      'Vape-Pod',
      'Saturday Off',
      'Mobile Usage/Wifi',
      'Sleeping'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: String,
  approved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, { timestamps: true });

// Pre-save hook to set amount based on type
fineSchema.pre('save', function(next) {
  const fineAmounts = {
    'Clothing': 300,
    'Late': 300,
    'Absent': 500,
    'Performance': 500,
    'Late After Break': 300,
    'MisBehave': 1000,
    'Vape-Pod': 300,
    'Saturday Off': 500,
    'Mobile Usage/Wifi': 300,
    'Sleeping': 300
  };
  
  if (!this.amount) {
    this.amount = fineAmounts[this.type] || 0;
  }
  next();
});

// Add indexes for optimal query performance
fineSchema.index({ employee: 1, date: -1 }); // For employee fine history
fineSchema.index({ approved: 1, createdAt: -1 }); // For pending fines
fineSchema.index({ type: 1 }); // For fine type analysis
fineSchema.index({ date: 1 }); // For date range queries
fineSchema.index({ employee: 1, approved: 1 }); // For employee pending fines
fineSchema.index({ amount: 1 }); // For high-value fines
fineSchema.index({ createdAt: -1 }); // For recent fines

const Fine = mongoose.model('Fine', fineSchema);
export default Fine;