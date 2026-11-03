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

// ── Agent name resolution (tolerates spelling mistakes) ─────────────────────

// Sound-alike key: "fakhra" and "fakhira" both become "fkhr"
const phoneticKey = (token) => {
  const letters = token.toLowerCase().replace(/[^a-z]/g, '')
    .replace(/ph/g, 'f').replace(/kh/g, 'k').replace(/gh/g, 'g')
    .replace(/(.)\1+/g, '$1');
  return letters.charAt(0) + letters.slice(1).replace(/[aeiouyh]/g, '');
};

// 0 = same word, higher = worse, Infinity = not the same word
const scoreToken = (input, candidate) => {
  const a = input.toLowerCase().replace(/[^a-z]/g, '');
  const b = candidate.toLowerCase().replace(/[^a-z]/g, '');
  if (!a || !b) return Infinity;
  if (a === b) return 0;
  if (Math.min(a.length, b.length) <= 3) return Infinity; // too short to guess safely
  const distance = levenshteinDistance(a, b);
  const allowed = Math.max(a.length, b.length) <= 5 ? 1 : 2;
  if (distance <= allowed) return distance;
  if (phoneticKey(a) === phoneticKey(b) && distance <= allowed + 1) return distance;
  return Infinity;
};

const scoreEmployee = (tokens, employee) => {
  const first = employee.firstName || '';
  const last = (employee.lastName || '').replace(/\s+/g, '');
  if (tokens.length === 1) {
    return Math.min(scoreToken(tokens[0], first), scoreToken(tokens[0], last));
  }
  return scoreToken(tokens[0], first) + scoreToken(tokens.slice(1).join(''), last);
};

// Returns { employee, exact } or null. Exact (case-insensitive) matches win; otherwise the
// single closest Active employee within a small spelling distance. Ties return null so the
// sale goes to review instead of being credited to the wrong person.
export const resolveEmployeeByName = async (Employee, rawName) => {
  const name = normalizeName(rawName);
  if (!name) return null;
  const tokens = name.split(' ');
  const lower = name.toLowerCase();

  const employees = await Employee.find({}, 'firstName lastName status').lean();

  const exact = employees.filter((e) => {
    const first = normalizeName(e.firstName).toLowerCase();
    const last = normalizeName(e.lastName).toLowerCase();
    return tokens.length === 1
      ? lower === first || lower === last
      : lower === `${first} ${last}`.trim();
  });
  if (exact.length > 0) return { employee: exact[0], exact: true };

  let best = null;
  let bestScore = Infinity;
  let tied = false;
  employees.filter((e) => e.status === 'Active').forEach((e) => {
    const score = scoreEmployee(tokens, e);
    if (score < bestScore) { best = e; bestScore = score; tied = false; }
    else if (score === bestScore && score !== Infinity) tied = true;
  });

  return best && !tied && bestScore !== Infinity ? { employee: best, exact: false } : null;
};
