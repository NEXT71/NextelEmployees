export const normalizeName = (value = '') => String(value || '').trim().replace(/\s+/g, ' ');

export const levenshteinDistance = (a = '', b = '') => {
  const matrix = Array.from({ length: a.length + 1 }, () => []);

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const scoreCandidateName = (inputLower, candidateName) => {
  const candidateLower = normalizeName(candidateName).toLowerCase();
  if (!candidateLower) return Infinity;

  if (candidateLower === inputLower) {
    return 0;
  }

  if (candidateLower.includes(inputLower) || inputLower.includes(candidateLower)) {
    return Math.abs(candidateLower.length - inputLower.length);
  }

  return levenshteinDistance(inputLower, candidateLower);
};

export const getBestEmployeeNameMatch = async (Employee, rawName) => {
  const normalizedInput = normalizeName(rawName);
  if (!normalizedInput) return null;

  const inputLower = normalizedInput.toLowerCase();
  const employees = await Employee.find({}, 'firstName lastName');

  let bestMatch = null;
  let bestScore = Infinity;

  employees.forEach((employee) => {
    const fullName = normalizeName(`${employee.firstName || ''} ${employee.lastName || ''}`);
    if (!fullName) return;

    const candidateNames = [
      fullName,
      normalizeName(employee.firstName || ''),
      normalizeName(employee.lastName || ''),
      ...fullName.split(' ')
    ].filter(Boolean);

    const score = Math.min(...candidateNames.map((candidate) => scoreCandidateName(inputLower, candidate)));

    if (score < bestScore) {
      bestScore = score;
      bestMatch = { employee, correctedName: fullName, score };
    }
  });

  if (!bestMatch) return null;

  const maxDistance = Math.max(1, Math.ceil(Math.min(normalizedInput.length, bestMatch.correctedName.length) * 0.45));
  return bestMatch.score <= maxDistance ? bestMatch : null;
};