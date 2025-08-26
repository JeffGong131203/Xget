import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import handler from './api/[...path].js';
import healthHandler from './api/health.js';

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const SSL_ENABLED = process.env.SSL_ENABLED === 'true';

// SSL redirect middleware (only when SSL is enabled)
if (SSL_ENABLED) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https' && !req.secure) {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// Health endpoint
app.get('/api/health', async (req, res) => {
  try {
    const request = new Request(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers
    });
    const response = await healthHandler(request);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.set(key, value);
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      res.json(await response.json());
    } else {
      res.send(await response.text());
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Main handler for all other routes
app.use('*', async (req, res) => {
  try {
    const request = new Request(`http://localhost:${PORT}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined
    });

    const response = await handler(request);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.set(key, value);
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      res.json(await response.json());
    } else if (response.body) {
      // Handle binary data
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } else {
      res.send(await response.text());
    }
  } catch (error) {
    console.error('Request handler error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

if (SSL_ENABLED) {
  // SSL configuration
  const sslOptions = {
    key: fs.readFileSync(path.join(process.cwd(), 'domain.key')),
    cert: fs.readFileSync(path.join(process.cwd(), 'domain.crt'))
  };

  // Create HTTPS server
  https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🚀 Xget HTTPS server running on port ${HTTPS_PORT}`);
    console.log(`📡 Health check: https://localhost:${HTTPS_PORT}/api/health`);
  });

  // Optionally, also run HTTP server for redirects or health checks
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Xget HTTP server running on port ${PORT} (redirect to HTTPS)`);
  });
} else {
  // Standard HTTP server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Xget server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
}
