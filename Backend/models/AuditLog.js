import mongoose from 'mongoose';

// Append-only record of who did what. Destructive actions store a snapshot of the
// removed document in `meta.snapshot` so the data can be recovered by hand.
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorName: { type: String, default: '' },
  actorRole: { type: String, default: '' },
  action: { type: String, required: true },       // e.g. 'sale.approve', 'employee.deactivate'
  entityType: { type: String, required: true },   // e.g. 'sale', 'employee', 'salary', 'fine', 'user'
  entityId: { type: String, default: '' },
  summary: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: null },
  ip: { type: String, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
