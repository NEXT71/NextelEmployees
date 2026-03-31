import mongoose from 'mongoose';

const salesTargetSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: () => new Date().toDateString()
  },
  salesCount: {
    type: Number,
    required: true,
    min: 0
  },
  // Target tiers: At what sales count does CSR enter each tier
  targetTiers: {
    tier1: {
      minSales: 5,
      multiplier: 1      // 5-6 sales get base rate
    },
    tier2: {
      minSales: 7,
      multiplier: 1.2    // 7-9 sales get 20% bonus
    },
    tier3: {
      minSales: 10,
      multiplier: 1.5    // 10+ sales get 50% bonus
    }
  },
  // Per-sale rate: 1 sale = 1000 RS
  pricePerSale: {
    type: Number,
    default: 1000       // 1 sale = 1000 RS
  },
  achievedTier: {
    type: Number,       // 1, 2, 3, or 0 if no tier achieved
    default: 0
  },
  baseSalaryForDay: {
    type: Number,       // salesCount × pricePerSale
    default: 0
  },
  tierBonus: {
    type: Number,       // Extra bonus based on tier multiplier
    default: 0
  },
  totalEarningForDay: {
    type: Number,       // baseSalary + tierBonus
    default: 0
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// Index for efficient querying
salesTargetSchema.index({ employee: 1, date: 1 }, { unique: true });
salesTargetSchema.index({ date: 1 });
salesTargetSchema.index({ employee: 1, createdAt: -1 }); // For employee sales history
salesTargetSchema.index({ achievedTier: 1 }); // For tier analysis
salesTargetSchema.index({ totalEarningForDay: 1 }); // For earning analysis
salesTargetSchema.index({ date: -1, employee: 1 }); // For recent sales by employee
salesTargetSchema.index({ createdAt: -1 }); // For recent records

// Pre-save hook to calculate achieved tier and bonuses
salesTargetSchema.pre('save', function(next) {
  const { salesCount, pricePerSale, targetTiers } = this;
  
  // Calculate base salary: sales × price per sale
  this.baseSalaryForDay = salesCount * pricePerSale;
  
  // Determine which tier was achieved and calculate bonus
  if (salesCount >= targetTiers.tier3.minSales) {
    this.achievedTier = 3;
    // Tier 3: 50% bonus on base salary
    this.tierBonus = this.baseSalaryForDay * 0.5;
  } else if (salesCount >= targetTiers.tier2.minSales) {
    this.achievedTier = 2;
    // Tier 2: 20% bonus on base salary
    this.tierBonus = this.baseSalaryForDay * 0.2;
  } else if (salesCount >= targetTiers.tier1.minSales) {
    this.achievedTier = 1;
    // Tier 1: No bonus (base rate)
    this.tierBonus = 0;
  } else {
    this.achievedTier = 0;
    this.tierBonus = 0; // Below tier 1, no pay
  }
  
  // Total earning: base + bonus
  this.totalEarningForDay = this.baseSalaryForDay + this.tierBonus;
  
  next();
});

const SalesTarget = mongoose.model('SalesTarget', salesTargetSchema);
export default SalesTarget;
