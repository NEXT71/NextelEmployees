const CPL_DIDS = new Set([
  'D3', 'D4', 'D6', 'D7SD', 'D12', 'D36', 'D38', 'D40',
  'D31', 'D33', 'D41'
]);

export const hasCplDid = (dids = '') => {
  const matches = String(dids).match(/(?:^|[^A-Z0-9])(D7SD|D\d+)(?=$|[^A-Z0-9])/gi) || [];
  return matches.some((match) => CPL_DIDS.has(match.trim().toUpperCase()));
};
