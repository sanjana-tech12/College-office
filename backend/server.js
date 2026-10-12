const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Health check endpoint (used by Docker HEALTHCHECK)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Auth Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Requests Routes
app.use('/api/requests', require('./routes/requestRoutes'));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'), (err) => {
    if (err) {
      res.json({ message: 'College Office Request Tracker API' });
    }
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 3000;
const ALT_PORT = process.env.ALT_PORT || 5000;

// Start server after connecting to database
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] College Office Request Tracker running on port ${PORT}`);
    });

    // Also listen on ALT_PORT (5000) for seamless cross-port access if available
    if (ALT_PORT && String(ALT_PORT) !== String(PORT)) {
      try {
        const altServer = app.listen(ALT_PORT, () => {
          console.log(`[Server] Secondary port enabled: listening on port ${ALT_PORT} (http://localhost:${ALT_PORT})`);
        });
        altServer.on('error', (err) => {
          console.log(`[Server] Secondary port ${ALT_PORT} unavailable (${err.message}). Running on primary port ${PORT}.`);
        });
      } catch (e) {
        // Fallback gracefully if secondary port binding fails
      }
    }
  });
}

module.exports = app;
