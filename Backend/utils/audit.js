import AuditLog from '../models/AuditLog.js';

const toPlain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);

// Record an audit entry. Never throws: a logging failure must not break the action itself.
export const logAudit = async (req, { action, entityType, entityId, summary = '', meta = null }) => {
  try {
    await AuditLog.create({
      actor: req?.user?._id || null,
      actorName: req?.user?.username || '',
      actorRole: req?.user?.role || '',
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      summary,
      meta,
      ip: req?.ip || ''
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

// Same, with a snapshot of the document(s) about to be removed.
export const logAuditDelete = (req, { action, entityType, entityId, summary, snapshot, meta = {} }) =>
  logAudit(req, {
    action,
    entityType,
    entityId,
    summary,
    meta: { ...meta, snapshot: Array.isArray(snapshot) ? snapshot.map(toPlain) : toPlain(snapshot) }
  });
