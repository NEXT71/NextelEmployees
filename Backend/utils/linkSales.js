import SalesTarget from '../models/SalesTarget.js';
import { normalizeName } from './employeeMatch.js';
import { emitSalesSubmissionUpdate } from './socket.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Attach "under_review" sales (submitted under a name with no registered employee)
// to a newly registered employee when the submitted name matches exactly
// (case-insensitive), and move them to "pending" so QA can review them.
export const linkUnderReviewSalesToEmployee = async (employee) => {
  const fullName = normalizeName(`${employee.firstName || ''} ${employee.lastName || ''}`);
  if (!fullName) return 0;

  const filter = {
    status: 'under_review',
    agent: null,
    agentName: { $regex: new RegExp(`^${escapeRegex(fullName)}$`, 'i') }
  };

  const ids = (await SalesTarget.find(filter).select('_id').lean()).map((s) => s._id);
  if (ids.length === 0) return 0;

  await SalesTarget.updateMany(
    { _id: { $in: ids }, status: 'under_review' },
    { $set: { agent: employee._id, agentName: fullName, status: 'pending' } }
  );

  emitSalesSubmissionUpdate({ type: 'linked', submissionIds: ids.map(String), agent: String(employee._id) });
  return ids.length;
};
