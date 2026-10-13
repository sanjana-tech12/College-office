const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const client = require('prom-client');

// Collect default system metrics (CPU, Memory, Event Loop)
client.collectDefaultMetrics({ register: client.register, prefix: 'node_' });

// Custom Prometheus HTTP metrics
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics collection middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;
    const route = req.baseUrl || req.path || 'unknown';
    httpRequestDurationSeconds.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
  });
  next();
});

// Serve static frontend assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

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
