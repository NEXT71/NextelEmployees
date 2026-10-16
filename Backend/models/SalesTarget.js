import mongoose from 'mongoose';
import { getSalesShiftDate, getSalesShiftRange } from '../utils/salesShift.js';
import { BASE_PER_SALE, getDailyTier } from '../utils/payRules.js';
const salesTargetSchema = new mongoose.Schema({
  // Agent who made the sale
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: false,
    default: null
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
  closerRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
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
    default: BASE_PER_SALE
  },
  baseSalary: {
    type: Number,
    default: BASE_PER_SALE
  },
  
  // Approval workflow
  status: {
    type: String,
    // under_review: submitted under a name that matches no registered employee yet.
    // Cannot be approved until an agent is linked (then it becomes pending).
    enum: ['pending', 'approved', 'disapproved', 'under_review'],
    default: 'pending'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  
  disapprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  disapprovedAt: {
    type: Date,
    default: null
  },
  
  rejectionReason: {
    type: String,
    default: ''
  },
  
  // Tier and bonus calculated at daily aggregation level
  achievedTier: {
    type: Number,
    default: 0  // Calculated from daily total (3, 5, 8, 10, 15 sales)
  },
  tierBonus: {
    type: Number,
    default: 0  // Flat daily bonus amount: 500, 1000, 2000, 3000, or 5000 RS
  },
  totalEarning: {
    type: Number,
    default: BASE_PER_SALE  // baseSalary + tierBonus (flat)
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
salesTargetSchema.index({ agent: 1, status: 1 });
salesTargetSchema.index({ status: 1, createdAt: -1 });
salesTargetSchema.index({ saleDate: 1 });
salesTargetSchema.index({ agent: 1, createdAt: -1 });
salesTargetSchema.index({ 'customer.phone': 1 });
salesTargetSchema.index({ 'customer.state': 1 });
salesTargetSchema.index({ closer: 1 });
salesTargetSchema.index({ createdAt: -1 });

// Post-save hook to calculate daily tier bonuses (only for approved sales)
salesTargetSchema.post('save', async function(doc) {
  try {
    // Only calculate bonuses for approved sales
    if (doc.status !== 'approved') {
      return;
    }

    const shiftDate = getSalesShiftDate(doc.createdAt || doc.saleDate);
    const shiftRange = getSalesShiftRange(shiftDate);
    if (!shiftRange) return;
    
    // Count ONLY APPROVED sales for this agent on this day
    const dailySalesCount = await this.constructor.countDocuments({
      agent: doc.agent,
      status: 'approved',  // Only count approved sales
      createdAt: {
        $gte: shiftRange.start,
        $lt: shiftRange.end
      }
    });
    
    // Tier rules live in utils/payRules.js
    const { tier: achievedTier, bonus: tierBonus } = getDailyTier(dailySalesCount);

    // Calculate total earning: (daily sales count × base salary) + flat daily bonus
    const baseSalary = doc.baseSalary;
    const totalEarning = (dailySalesCount * baseSalary) + tierBonus;
    
    // Update ONLY APPROVED records for the day with calculated bonus
    await this.constructor.updateMany(
      {
        agent: doc.agent,
        status: 'approved',  // Only update approved sales
        createdAt: {
          $gte: shiftRange.start,
          $lt: shiftRange.end
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
