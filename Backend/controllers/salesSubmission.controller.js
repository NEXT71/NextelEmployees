import SalesTarget from '../models/SalesTarget.js';
import Employee from '../models/Employee.js';

// Create a new sales submission (from Google Form or manual)
const createSubmission = async (req, res, next) => {
  try {
    const { agent, agentName, agentPhone, customer, dids, closer, saleDate, submissionSource, googleFormResponseId } = req.body;

    // Validate required fields
    if (!agent || !agentName || !customer || !dids || !closer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: agent, agentName, customer, dids, closer'
      });
    }

    // Create submission with PENDING status
    const submission = new SalesTarget({
      agent,
      agentName,
      customer,
      dids,
      closer,
      saleDate: saleDate || new Date(),
      status: 'pending',  // Start as pending
      baseSalary: 1000,
      pricePerSale: 1000
    });

    await submission.save();

    res.status(201).json({
      success: true,
      message: 'Sales submission created successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Get all submissions with optional status filter
const getSubmissions = async (req, res, next) => {
  try {
    const { status, agentId, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (agentId) filter.agent = agentId;

    const skip = (page - 1) * limit;

    const submissions = await SalesTarget.find(filter)
      .populate('agent', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .populate('disapprovedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SalesTarget.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get submission by ID
const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await SalesTarget.findById(req.params.id)
      .populate('agent', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .populate('disapprovedBy', 'firstName lastName');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Sales submission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Approve a single submission
const approveSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;

    const submission = await SalesTarget.findById(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Sales submission not found'
      });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve submission with status: ${submission.status}`
      });
    }

    // Update to approved status
    submission.status = 'approved';
    submission.approvedBy = req.user._id;
    submission.approvedAt = new Date();
    await submission.save();  // This triggers post-save hook to calculate bonus

    res.status(200).json({
      success: true,
      message: 'Sales submission approved successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Disapprove a single submission
const disapproveSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const submission = await SalesTarget.findById(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Sales submission not found'
      });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot disapprove submission with status: ${submission.status}`
      });
    }

    // Update to disapproved status
    submission.status = 'disapproved';
    submission.disapprovedBy = req.user._id;
    submission.disapprovedAt = new Date();
    submission.rejectionReason = rejectionReason || '';
    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Sales submission disapproved successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// Bulk approve submissions
const bulkApproveSubmissions = async (req, res, next) => {
  try {
    const { submissionIds } = req.body;

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'submissionIds must be a non-empty array'
      });
    }

    const submissions = await SalesTarget.find({
      _id: { $in: submissionIds },
      status: 'pending'
    });

    if (submissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending submissions found with provided IDs'
      });
    }

    const approvalResults = [];

    for (const submission of submissions) {
      try {
        // Update to approved
        submission.status = 'approved';
        submission.approvedBy = req.user._id;
        submission.approvedAt = new Date();
        await submission.save();  // Triggers post-save hook for bonus calculation

        approvalResults.push({
          submissionId: submission._id,
          status: 'approved'
        });
      } catch (error) {
        approvalResults.push({
          submissionId: submission._id,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successCount = approvalResults.filter(r => r.status === 'approved').length;
    const failedCount = approvalResults.filter(r => r.status === 'failed').length;

    res.status(200).json({
      success: successCount > 0,
      message: `Bulk approval completed: ${successCount} approved, ${failedCount} failed`,
      data: {
        summary: {
          total: submissions.length,
          approved: successCount,
          failed: failedCount
        },
        results: approvalResults
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk disapprove submissions
const bulkDisapproveSubmissions = async (req, res, next) => {
  try {
    const { submissionIds, rejectionReason } = req.body;

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'submissionIds must be a non-empty array'
      });
    }

    const submissions = await SalesTarget.find({
      _id: { $in: submissionIds },
      status: 'pending'
    });

    if (submissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending submissions found with provided IDs'
      });
    }

    const disapprovalResults = [];

    for (const submission of submissions) {
      try {
        submission.status = 'disapproved';
        submission.disapprovedBy = req.user._id;
        submission.disapprovedAt = new Date();
        submission.rejectionReason = rejectionReason || '';
        await submission.save();

        disapprovalResults.push({
          submissionId: submission._id,
          status: 'disapproved'
        });
      } catch (error) {
        disapprovalResults.push({
          submissionId: submission._id,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successCount = disapprovalResults.filter(r => r.status === 'disapproved').length;
    const failedCount = disapprovalResults.filter(r => r.status === 'failed').length;

    res.status(200).json({
      success: successCount > 0,
      message: `Bulk disapproval completed: ${successCount} disapproved, ${failedCount} failed`,
      data: {
        summary: {
          total: submissions.length,
          disapproved: successCount,
          failed: failedCount
        },
        results: disapprovalResults
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get pending submissions count
const getPendingCount = async (req, res, next) => {
  try {
    const count = await SalesTarget.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        pendingCount: count
      }
    });
  } catch (error) {
    next(error);
  }
};

export {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  approveSubmission,
  disapproveSubmission,
  bulkApproveSubmissions,
  bulkDisapproveSubmissions,
  getPendingCount
};
