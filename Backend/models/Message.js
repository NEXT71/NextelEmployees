import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subject: {
    type: String,
    required: true,
    maxLength: 200
  },
  message: {
    type: String,
    required: true,
    maxLength: 1000
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['technical', 'hr', 'payroll', 'attendance', 'general'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'responded', 'resolved'],
    default: 'unread'
  },
  adminResponse: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String
  }],
  tags: [String], // For tagging specific admins or topics
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isUrgent: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
messageSchema.index({ from: 1, createdAt: -1 });
messageSchema.index({ to: 1, status: 1, createdAt: -1 });
messageSchema.index({ status: 1, createdAt: -1 });
messageSchema.index({ category: 1, createdAt: -1 });

// Virtual for sender details
messageSchema.virtual('senderDetails', {
  ref: 'Employee',
  localField: 'from',
  foreignField: 'user',
  justOne: true
});

const Message = mongoose.model('Message', messageSchema);
export default Message;