const express = require('express');
const router = express.Router();
const {
  createRequest,
  getMyRequests,
  getRequestById,
  getAllRequests,
  updateRequest,
} = require('../controllers/requestController');
const {
  authenticate,
  requireStaff,
  requireStudent,
} = require('../middleware/auth');

// POST /api/requests - Student only: submit request
router.post('/', authenticate, requireStudent, createRequest);

// GET /api/requests/my - Student only: view own requests
router.get('/my', authenticate, requireStudent, getMyRequests);

// GET /api/requests - Staff only: view all requests with filtering (?status=, ?search=)
router.get('/', authenticate, requireStaff, getAllRequests);

// GET /api/requests/:requestId - Student (own only) or Staff (any)
router.get('/:requestId', authenticate, getRequestById);

// PATCH /api/requests/:requestId - Staff only: update status and remarks
router.patch('/:requestId', authenticate, requireStaff, updateRequest);

module.exports = router;
