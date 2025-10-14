import Message from '../models/Message.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

// Send message to admins
const sendMessage = async (req, res, next) => {
  try {
    const { subject, message, priority, category, tags, targetAdmins } = req.body;
    const fromUserId = req.user.userId || req.user.employeeId;

    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    let adminUsers;
    
    // If specific admins are targeted, validate and get those admins
    if (targetAdmins && Array.isArray(targetAdmins) && targetAdmins.length > 0) {
      adminUsers = await User.find({ 
        _id: { $in: targetAdmins }, 
        role: 'admin' 
      }).select('_id username email');
      
      if (adminUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No valid admin users found in the target list'
        });
      }
      
      // Check if all requested admins were found
      if (adminUsers.length !== targetAdmins.length) {
        return res.status(400).json({
          success: false,
          message: 'Some of the targeted admin users were not found or are not admins'
        });
      }
    } else {
      // Get all admin users (default behavior)
      adminUsers = await User.find({ role: 'admin' }).select('_id username email');
      
      if (adminUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No admin users found'
        });
      }
    }

    // Create message
    const newMessage = new Message({
      from: fromUserId,
      to: adminUsers.map(admin => admin._id),
      subject,
      message,
      priority: priority || 'medium',
      category: category || 'general',
      tags: tags || [],
      isUrgent: priority === 'urgent'
    });

    await newMessage.save();

    // Populate the message with sender details
    await newMessage.populate([
      {
        path: 'from',
        select: 'username email'
      },
      {
        path: 'to',
        select: 'username email'
      },
      {
        path: 'senderDetails',
        select: 'firstName lastName employeeId department'
      }
    ]);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully to all admins',
      data: newMessage
    });

  } catch (err) {
    next(err);
  }
};

// Get messages sent by current user (employee)
const getMyMessages = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.employeeId;
    const { page = 1, limit = 10, status, category } = req.query;

    const filter = { from: userId };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const messages = await Message.find(filter)
      .populate('to', 'username email')
      .populate('adminResponse.respondedBy', 'username email')
      .populate('senderDetails', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(filter);

    res.json({
      success: true,
      data: messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total
      }
    });

  } catch (err) {
    next(err);
  }
};

// Get all messages for admins
const getAdminMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, category, priority } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const messages = await Message.find(filter)
      .populate('from', 'username email')
      .populate('senderDetails', 'firstName lastName employeeId department contact')
      .populate('adminResponse.respondedBy', 'username email')
      .sort({ createdAt: -1, isUrgent: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter out messages where 'from' couldn't be populated (invalid references)
    const validMessages = messages.filter(message => message.from);

    const total = await Message.countDocuments(filter);

    // Get unread count
    const unreadCount = await Message.countDocuments({ 
      status: 'unread',
      to: req.user.userId || req.user.employeeId 
    });

    res.json({
      success: true,
      data: validMessages,
      unreadCount,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        validMessages: validMessages.length
      }
    });

  } catch (err) {
    next(err);
  }
};

// Admin respond to message
const respondToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { response } = req.body;
    const adminUserId = req.user.userId || req.user.employeeId;

    if (!response) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Update message with admin response
    message.adminResponse = {
      message: response,
      respondedBy: adminUserId,
      respondedAt: new Date()
    };
    message.status = 'responded';

    await message.save();

    // Populate the response
    await message.populate([
      {
        path: 'from',
        select: 'username email'
      },
      {
        path: 'senderDetails',
        select: 'firstName lastName employeeId department'
      },
      {
        path: 'adminResponse.respondedBy',
        select: 'username email'
      }
    ]);

    res.json({
      success: true,
      message: 'Response sent successfully',
      data: message
    });

  } catch (err) {
    next(err);
  }
};

// Mark message as read
const markAsRead = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId || req.user.employeeId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user already marked as read
    const alreadyRead = message.readBy.some(read => read.user.toString() === userId);
    
    if (!alreadyRead) {
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });

      // Update status to read if it was unread
      if (message.status === 'unread') {
        message.status = 'read';
      }

      await message.save();
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (err) {
    next(err);
  }
};

// Get message statistics for admin
const getMessageStats = async (req, res, next) => {
  try {
    const stats = await Message.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Message.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Message.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalMessages = await Message.countDocuments();
    const urgentMessages = await Message.countDocuments({ isUrgent: true, status: { $ne: 'resolved' } });

    res.json({
      success: true,
      data: {
        totalMessages,
        urgentMessages,
        statusBreakdown: stats,
        categoryBreakdown: categoryStats,
        priorityBreakdown: priorityStats
      }
    });

  } catch (err) {
    next(err);
  }
};

// Resolve message
const resolveMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { status: 'resolved' },
      { new: true }
    ).populate('from', 'username email')
     .populate('senderDetails', 'firstName lastName employeeId');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message marked as resolved',
      data: message
    });

  } catch (err) {
    next(err);
  }
};

// Get all available admins for targeting
const getAvailableAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('_id username email')
      .sort({ username: 1 });

    res.json({
      success: true,
      data: admins
    });

  } catch (err) {
    next(err);
  }
};

export {
  sendMessage,
  getMyMessages,
  getAdminMessages,
  respondToMessage,
  markAsRead,
  getMessageStats,
  resolveMessage,
  getAvailableAdmins
};