import Setting from '../models/Setting.js';

export const DEFAULT_FINE_AMOUNTS = {
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

const CACHE_MS = 30 * 1000;
let fineCache = { at: 0, value: null };

export const clearSettingsCache = () => {
  fineCache = { at: 0, value: null };
};

// Fine amounts per type: the superadmin's saved values, falling back to the defaults.
// Only fines created after a change use the new amounts; existing fines keep theirs.
export const getFineAmounts = async () => {
  if (fineCache.value && Date.now() - fineCache.at < CACHE_MS) return fineCache.value;
  let stored = null;
  try {
    stored = await Setting.findOne({ key: 'fineAmounts' }).lean();
  } catch (err) {
    console.error('Reading fineAmounts setting failed, using defaults:', err.message);
  }
  const value = { ...DEFAULT_FINE_AMOUNTS, ...(stored?.value || {}) };
  fineCache = { at: Date.now(), value };
  return value;
};
