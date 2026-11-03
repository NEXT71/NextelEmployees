const CPL_DIDS = new Set([
  'D3', 'D4', 'D6', 'D7SD', 'D12', 'D36', 'D38', 'D40',
  'D31', 'D33', 'D41'
]);

// Lines that count toward the verifier daily bonus
const VERIFIER_BONUS_DIDS = new Set(['D1', 'D3', 'D4', 'D6', 'D12', 'D36', 'D38']);

const matchesDidSet = (dids, set) => {
  const matches = String(dids).match(/(?:^|[^A-Z0-9])(D7SD|D\d+)(?=$|[^A-Z0-9])/gi) || [];
  return matches.some((match) => set.has(match.trim().toUpperCase().replace(/^[^A-Z0-9]/, '')));
};

export const hasCplDid = (dids = '') => matchesDidSet(dids, CPL_DIDS);

export const hasVerifierBonusDid = (dids = '') => matchesDidSet(dids, VERIFIER_BONUS_DIDS);
