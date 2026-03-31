import mongoose from 'mongoose';

const salesTargetSchema = new mongoose.Schema({
  // Agent who made the sale
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  agentName: {
    type: String,
    required: true
  },
  
  // Customer information (from Google Form submission)
  customer: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    }
  },
  
  // Sale details (from Google Form)
  dids: {
    type: String,
    required: true
  },
  closer: {
    type: String,
    required: true
  },
  
  // Each form submission = 1 sale
  salesCount: {
    type: Number,
    default: 1,
    min: 1,
    max: 1
  },
  
  // Pricing for this sale
  pricePerSale: {
    type: Number,
    default: 1000
  },
  baseSalary: {
    type: Number,
    default: 1000  // 1 sale × 1000 RS
  },
  
  // Tier and bonus calculated at daily aggregation level
  achievedTier: {
    type: Number,
    default: 0  // 0, 1, 2, 3, or 4 - calculated from daily total (3, 5, 8, 12 sales)
  },
  tierBonus: {
    type: Number,
    default: 0  // Flat bonus amount: 500, 1000, 3000, or 5000 RS
  },
  totalEarning: {
    type: Number,
    default: 1000  // baseSalary + tierBonus (flat)
  },
  
  // When was this sale made
  saleDate: {
    type: Date,
    required: true,
    default: () => new Date()
  }
}, { timestamps: true });

// Indexes for efficient querying
salesTargetSchema.index({ agent: 1, saleDate: 1 });
salesTargetSchema.index({ saleDate: 1 });
salesTargetSchema.index({ agent: 1, createdAt: -1 });
salesTargetSchema.index({ 'customer.phone': 1 });
salesTargetSchema.index({ 'customer.state': 1 });
salesTargetSchema.index({ closer: 1 });
salesTargetSchema.index({ createdAt: -1 });

// Post-save hook to calculate daily tier bonuses
salesTargetSchema.post('save', async function(doc) {
  try {
    // Get the start and end of the sale date (same day)
    const startOfDay = new Date(doc.saleDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(doc.saleDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Count total sales for this agent on this day
    const dailySalesCount = await this.constructor.countDocuments({
      agent: doc.agent,
      saleDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    // Tier definitions: Flat bonus based on daily sales count
    const TIER_CONFIG = {
      tier1: { minSales: 3, bonus: 500 },       // 3-4 sales: 500 RS bonus
      tier2: { minSales: 5, bonus: 1000 },      // 5-7 sales: 1000 RS bonus
      tier3: { minSales: 8, bonus: 3000 },      // 8-11 sales: 3000 RS bonus
      tier4: { minSales: 12, bonus: 5000 }      // 12+ sales: 5000 RS bonus
    };
    
    let achievedTier = 0;
    let tierBonus = 0;
    
    if (dailySalesCount >= TIER_CONFIG.tier4.minSales) {
      achievedTier = 4;
      tierBonus = TIER_CONFIG.tier4.bonus;
    } else if (dailySalesCount >= TIER_CONFIG.tier3.minSales) {
      achievedTier = 3;
      tierBonus = TIER_CONFIG.tier3.bonus;
    } else if (dailySalesCount >= TIER_CONFIG.tier2.minSales) {
      achievedTier = 2;
      tierBonus = TIER_CONFIG.tier2.bonus;
    } else if (dailySalesCount >= TIER_CONFIG.tier1.minSales) {
      achievedTier = 1;
      tierBonus = TIER_CONFIG.tier1.bonus;
    }
    
    // Calculate total earning: (daily sales count × base salary) + flat daily bonus
    const baseSalary = doc.baseSalary;
    const totalEarning = (dailySalesCount * baseSalary) + tierBonus;
    
    // Update this record and all records for the day with calculated bonus
    await this.constructor.updateMany(
      {
        agent: doc.agent,
        saleDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      },
      {
        achievedTier,
        tierBonus,
        totalEarning: Math.round(totalEarning)
      }
    );
  } catch (error) {
    console.error('Error calculating daily tier bonus:', error);
  }
});

const SalesTarget = mongoose.model('SalesTarget', salesTargetSchema);
export default SalesTarget;
