// Single source of truth for sales pay rules (RS). Change rates here only.

export const BASE_PER_SALE = 1000;        // paid per approved CSR sale
export const CLOSER_RATE_PER_CLOSE = 200; // paid per close to a closer/verifier

// Daily bonus tiers, highest first. Based on approved sales in one sales shift day.
export const DAILY_TIERS = [
  { tier: 4, name: 'tier4', minSales: 12, bonus: 5000 },
  { tier: 3, name: 'tier3', minSales: 8, bonus: 3000 },
  { tier: 2, name: 'tier2', minSales: 5, bonus: 1000 },
  { tier: 1, name: 'tier1', minSales: 3, bonus: 500 }
];

const NO_TIER = { tier: 0, name: 'noTier', minSales: 0, bonus: 0 };

export const getDailyTier = (approvedCount) =>
  DAILY_TIERS.find((t) => approvedCount >= t.minSales) || NO_TIER;

export const calcTierBonus = (approvedCount) => getDailyTier(approvedCount).bonus;

export const getTierName = (approvedCount) => getDailyTier(approvedCount).name;

// Earnings for one day: base for every approved sale plus the flat daily bonus.
export const calcDailyEarning = (approvedCount) =>
  approvedCount * BASE_PER_SALE + calcTierBonus(approvedCount);

export const calcCloserPay = (closeCount) => closeCount * CLOSER_RATE_PER_CLOSE;
