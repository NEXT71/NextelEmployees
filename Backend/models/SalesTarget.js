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
    default: 0  // 0, 1, 2, or 3 - calculated from daily total
  },
  tierBonus: {
    type: Number,
    default: 0  // Bonus calculated at daily aggregation
  },
  totalEarning: {
    type: Number,
    default: 1000  // baseSalary + tierBonus
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
    
    // Tier definitions: At what sales count does agent achieve each tier
    const TIER_CONFIG = {
      tier1: { minSales: 5, multiplier: 1 },      // 5-6 sales: base rate
      tier2: { minSales: 7, multiplier: 1.2 },    // 7-9 sales: 20% bonus
      tier3: { minSales: 10, multiplier: 1.5 }    // 10+ sales: 50% bonus
    };
    
    let achievedTier = 0;
    let tierMultiplier = 1;
    
    if (dailySalesCount >= TIER_CONFIG.tier3.minSales) {
      achievedTier = 3;
      tierMultiplier = TIER_CONFIG.tier3.multiplier;
    } else if (dailySalesCount >= TIER_CONFIG.tier2.minSales) {
      achievedTier = 2;
      tierMultiplier = TIER_CONFIG.tier2.multiplier;
    } else if (dailySalesCount >= TIER_CONFIG.tier1.minSales) {
      achievedTier = 1;
      tierMultiplier = TIER_CONFIG.tier1.multiplier;
    }
    
    // Calculate bonus for this individual sale
    const baseSalary = doc.baseSalary;
    const tierBonus = baseSalary * (tierMultiplier - 1);
    const totalEarning = baseSalary + tierBonus;
    
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
        tierBonus: Math.round(tierBonus),
        totalEarning: Math.round(totalEarning)
      }
    );
  } catch (error) {
    console.error('Error calculating daily tier bonus:', error);
  }
});

const SalesTarget = mongoose.model('SalesTarget', salesTargetSchema);
export default SalesTarget;
