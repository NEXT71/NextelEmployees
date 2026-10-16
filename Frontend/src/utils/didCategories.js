const DID_CATEGORIES = {
  'D3': 'ACA CPL',
  'D4': 'ACA CPL',
  'D6': 'ACA CPL',
  'D7SD': 'ACA CPL',
  'D12': 'ACA CPL',
  'D36': 'ACA CPL',
  'D38': 'ACA CPL',
  'D40': 'ACA CPL',
  'D2': 'ACA CPA',
  'D5': 'ACA CPA',
  'D9': 'ACA CPA',
  'D10': 'ACA CPA',
  'D20': 'ACA CPA',
  'D22': 'ACA CPA',
  'D35': 'ACA CPA',
  'D37': 'ACA CPA',
  'D39': 'ACA CPA',
  'D31': 'MED CPL',
  'D33': 'MED CPL',
  'D41': 'MED CPL',
  'D32': 'MED CPA',
  'D34': 'MED CPA',
  'D42': 'HI',
  'D43': 'HI',
  'D44': 'HI',
  'D45': 'HI',
  'D46': 'HI',
  'D47': 'HI'
};

export const getDidCategories = (dids = '') => {
  const categories = new Set();
  String(dids).replace(/(?:^|[^A-Z0-9])(D7SD|D\d+)(?=$|[^A-Z0-9])/gi, (_, code) => {
    if (DID_CATEGORIES[code.toUpperCase()]) {
      categories.add(DID_CATEGORIES[code.toUpperCase()]);
    }
    return _;
  });

  return [...categories].join(', ');
};
