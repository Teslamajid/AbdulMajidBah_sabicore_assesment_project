import express from 'express';
import searchRouter from './routes/search.js';
import studiesRouter from './routes/studies.js';
import screenRouter from './routes/screen.js';
import { log, logError } from './lib/logger.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

// Health check — useful for uptime probes and Vercel status pings.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sabi-core-b2', timestamp: new Date().toISOString() });
});

app.use('/api/search', searchRouter);
app.use('/api/studies', studiesRouter);
app.use('/api/screen', screenRouter);

// 404 handler for unknown /api routes.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Centralised error handler. Logs the failure and returns a sanitized message.
// The final `next` parameter is required for Express to recognise this as an
// error-handling middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logError('unhandled_error', err, { method: req.method, url: req.originalUrl });
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({ error: err?.message ?? 'Internal Server Error' });
});

log('app_ready', { service: 'sabi-core-b2' });

export default app;
