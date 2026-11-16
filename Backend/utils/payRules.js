// Single source of truth for sales pay rules (RS). Change rates here only.
import { getSalesShiftDate } from './salesShift.js';
import { hasCsrBonusDid } from './didCategories.js';

export const BASE_PER_SALE = 1000;        // paid per approved CSR sale
export const CLOSER_RATE_PER_CLOSE = 200; // paid per close to a closer/verifier

// Legacy CSR daily bonus tiers (shift days before CSR_LINE_BONUS_START_SHIFT_DATE),
// highest first. Based on ALL approved sales in one sales shift day.
export const DAILY_TIERS = [
  { tier: 5, name: 'tier5', minSales: 15, bonus: 5000 },
  { tier: 4, name: 'tier4', minSales: 10, bonus: 3000 },
  { tier: 3, name: 'tier3', minSales: 8, bonus: 2000 },
  { tier: 2, name: 'tier2', minSales: 5, bonus: 1000 },
  { tier: 1, name: 'tier1', minSales: 3, bonus: 500 }
];

// CSR daily bonus from CSR_LINE_BONUS_START_SHIFT_DATE onwards, highest first. Replaces
// DAILY_TIERS and counts only approved sales on the CSR bonus lines (see hasCsrBonusDid).
export const CSR_LINE_BONUS_START_SHIFT_DATE = '2026-11-01';
export const CSR_LINE_DAILY_TIERS = [
  { tier: 4, name: 'tier4', minSales: 12, bonus: 5000 },
  { tier: 3, name: 'tier3', minSales: 8, bonus: 2000 },
  { tier: 2, name: 'tier2', minSales: 5, bonus: 1000 },
  { tier: 1, name: 'tier1', minSales: 3, bonus: 500 }
];

export const WEEKLY_BONUS_MIN_SALES = 35;
export const WEEKLY_BONUS_AMOUNT = 5000;

const NO_TIER = { tier: 0, name: 'noTier', minSales: 0, bonus: 0 };

export const usesCsrLineTiers = (shiftDate) =>
  Boolean(shiftDate) && shiftDate >= CSR_LINE_BONUS_START_SHIFT_DATE;

// Tier table that applies to a shift day (YYYY-MM-DD)
export const getDailyTiersFor = (shiftDate) =>
  usesCsrLineTiers(shiftDate) ? CSR_LINE_DAILY_TIERS : DAILY_TIERS;

// day = { shiftDate, total, lineSales }: total = all approved sales that shift day,
// lineSales = approved sales on the CSR bonus lines that shift day.
const tierCount = ({ shiftDate, total = 0, lineSales = 0 }) =>
  usesCsrLineTiers(shiftDate) ? lineSales : total;

export const getDailyTier = (day) =>
  getDailyTiersFor(day.shiftDate).find((t) => tierCount(day) >= t.minSales) || NO_TIER;

export const calcTierBonus = (day) => getDailyTier(day).bonus;

export const calcWeeklyBonus = (approvedCount) =>
  approvedCount >= WEEKLY_BONUS_MIN_SALES ? WEEKLY_BONUS_AMOUNT : 0;

export const getTierName = (day) => getDailyTier(day).name;

// Earnings for one day: base for every approved sale plus the flat daily bonus.
export const calcDailyEarning = (day) =>
  (day.total || 0) * BASE_PER_SALE + calcTierBonus(day);

// Group CSR sales (need createdAt/saleDate and dids) into { [shiftDate]: day } for the tier helpers
export const groupCsrSalesByDay = (sales) => {
  const days = {};
  sales.forEach((sale) => {
    const shiftDate = getSalesShiftDate(sale.createdAt || sale.saleDate);
    if (!shiftDate) return;
    if (!days[shiftDate]) days[shiftDate] = { shiftDate, total: 0, lineSales: 0 };
    days[shiftDate].total += 1;
    if (hasCsrBonusDid(sale.dids)) days[shiftDate].lineSales += 1;
  });
  return days;
};

export const calcCloserPay = (closeCount) => closeCount * CLOSER_RATE_PER_CLOSE;

// Verifier daily bonus, highest first. Based on approved closes on the bonus lines
// (see hasVerifierBonusDid) in one sales shift day.
export const VERIFIER_BONUS_START_SHIFT_DATE = '2026-11-01';
export const VERIFIER_DAILY_TIERS = [
  { minCloses: 40, bonus: 5000 },
  { minCloses: 30, bonus: 2000 },
  { minCloses: 20, bonus: 1000 }
];

export const calcVerifierDailyBonus = (closeCount) =>
  (VERIFIER_DAILY_TIERS.find((t) => closeCount >= t.minCloses) || { bonus: 0 }).bonus;
