const mongoose = require('mongoose');
const { Request, VALID_REQUEST_TYPES, VALID_STATUSES } = require('../models/Request');
const Counter = require('../models/Counter');

// Strict status flow transition map
// Submitted -> In Progress -> Approved | Rejected; Approved -> Ready for Collection | Completed.
// Ready for Collection -> Completed. Rejected and Completed are terminal.
const STATUS_TRANSITIONS = {
  'Submitted': ['In Progress'],
  'In Progress': ['Approved', 'Rejected', 'Completed'],
  'Approved': ['Ready for Collection', 'Completed'],
  'Ready for Collection': ['Completed'],
  'Rejected': [],
  'Completed': [],
};

// POST /api/requests (Student only: submit new request)
const createRequest = async (req, res, next) => {
  try {
    const { requestType, description } = req.body;

    if (!requestType || !description) {
      return res.status(400).json({ error: 'Request type and description are required.' });
    }

    if (!VALID_REQUEST_TYPES.includes(requestType)) {
      return res.status(400).json({
        error: `Invalid request type. Allowed values: ${VALID_REQUEST_TYPES.join(', ')}`,
      });
    }

    if (description.trim().length === 0) {
      return res.status(400).json({ error: 'Description cannot be empty.' });
    }

    // Atomic sequential ID generation (REQ-0001, REQ-0002, ...)
    const counter = await Counter.findByIdAndUpdate(
      'requestId',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const generatedId = `REQ-${String(counter.seq).padStart(4, '0')}`;

    const newRequest = new Request({
      requestId: generatedId,
      student: req.user.id,
      studentName: req.user.name,
      studentEmail: req.user.email,
      studentRollNo: req.user.studentId || '',
      requestType,
      description: description.trim(),
      status: 'Submitted',
      remarks: '',
    });

    await newRequest.save();

    res.status(201).json({
      message: 'Request submitted successfully.',
      request: newRequest,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/requests/my (Student only: view own requests)
const getMyRequests = async (req, res, next) => {
  try {
    const requests = await Request.find({ student: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/requests/:requestId (Student own only, Staff any)
const getRequestById = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    // Search by sequential requestId (e.g. REQ-0001) or Mongo ObjectId
    let query = { requestId };
    if (mongoose.Types.ObjectId.isValid(requestId)) {
      query = { $or: [{ requestId }, { _id: requestId }] };
    }

    const foundRequest = await Request.findOne(query);

    if (!foundRequest) {
      return res.status(404).json({ error: `Request '${requestId}' not found.` });
    }

    // If student, enforce they can only view their own request (HTTP 403 otherwise)
    if (req.user.role === 'student' && foundRequest.student.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to view requests belonging to other students.',
      });
    }

    res.status(200).json({
      request: foundRequest,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/requests (Staff only: view all requests with ?status= and ?search=)
const getAllRequests = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status.trim() !== '' && status !== 'all') {
      query.status = status.trim();
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { requestId: searchRegex },
        { studentName: searchRegex },
        { studentEmail: searchRegex },
        { studentRollNo: searchRegex },
        { requestType: searchRegex },
      ];
    }

    const requests = await Request.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/requests/:requestId (Staff only: update status and remarks)
const updateRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status: newStatus, remarks } = req.body;

    let query = { requestId };
    if (mongoose.Types.ObjectId.isValid(requestId)) {
      query = { $or: [{ requestId }, { _id: requestId }] };
    }

    const request = await Request.findOne(query);

    if (!request) {
      return res.status(404).json({ error: `Request '${requestId}' not found.` });
    }

    // Validate status transition if a status update is requested
    if (newStatus && newStatus !== request.status) {
      if (!VALID_STATUSES.includes(newStatus)) {
        return res.status(400).json({
          error: `Invalid status '${newStatus}'. Allowed statuses: ${VALID_STATUSES.join(', ')}`,
        });
      }

      const allowedTransitions = STATUS_TRANSITIONS[request.status] || [];

      if (allowedTransitions.length === 0) {
        return res.status(400).json({
          error: `Invalid status transition: '${request.status}' is a terminal status and cannot be modified.`,
        });
      }

      if (!allowedTransitions.includes(newStatus)) {
        return res.status(400).json({
          error: `Invalid status transition from '${request.status}' to '${newStatus}'. Allowed next status: [${allowedTransitions.join(', ')}]`,
        });
      }

      request.status = newStatus;
    }

    // Update remarks if provided
    if (remarks !== undefined) {
      request.remarks = remarks.trim();
    }

    // Record staff audit trail
    request.lastUpdatedBy = req.user.email;

    await request.save();

    res.status(200).json({
      message: 'Request updated successfully.',
      request,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  getAllRequests,
  updateRequest,
  STATUS_TRANSITIONS,
};
