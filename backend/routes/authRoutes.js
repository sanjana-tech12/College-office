const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public endpoints
router.post('/register', register);
router.post('/login', login);

// Authenticated endpoint
router.get('/me', authenticate, getMe);

module.exports = router;
