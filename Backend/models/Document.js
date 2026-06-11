import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  mimeType: {
    type: String,
    required: true
  },
  storageKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

documentSchema.index({ employeeId: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);
export default Document;