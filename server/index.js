import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import uploadRoutes from './routes/upload.js';
import { isSupabaseConfigured, db } from './config/db.js';
import { realtimeBus } from './config/realtime.js';
import { isCloudinaryConfigured } from './config/cloudinary.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    databaseMode: isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Not Configured',
    storageMode: isCloudinaryConfigured ? 'Cloudinary Cloud Storage' : 'Cloudinary Pending Configuration (needs Cloud Name & API Key in .env)'
  });
});

// ── Realtime SSE Stream ───────────────────────────────────────────
// Broadcasts live database events to all connected frontend clients
app.get('/api/realtime/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

// Send initial handshake
  res.write(`data: ${JSON.stringify({
    type: 'CONNECTED',
    timestamp: new Date().toISOString(),
    isSupabaseConfigured
  })}\n\n`);

  const onRealtimeChange = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  realtimeBus.on('change', onRealtimeChange);

  // Keep-alive heartbeat every 25 seconds to prevent proxy timeout
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    realtimeBus.off('change', onRealtimeChange);
  });
});

// ── Public Stats (Landing Page live counters) ─────────────────────
app.get('/api/realtime/stats', async (req, res) => {
  try {
    const stats = await db.admin.getStats();
    const assignments = await db.assignments.getAll();
    res.json({
      ...stats,
      totalAssignments: assignments.length,
      isSupabaseConfigured,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch realtime stats' });
  }
});

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/upload', uploadRoutes);

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Catch-all for any unmatched routes — return a clear JSON 404
// (Removed redirect to Vite: it caused "Cannot GET" errors when Supabase
//  magic-link clicks landed on the backend and got bounced in a redirect loop)
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// ── Start Server ──────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Sentinel Server running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Realtime Stream: http://localhost:${PORT}/api/realtime/stream`);
  console.log(`📊 Live Stats: http://localhost:${PORT}/api/realtime/stats`);
  console.log(`🗄️  Database Status: ${isSupabaseConfigured ? 'Connected to Supabase' : 'Supabase Not Configured'}`);
  console.log(`☁️  Cloudinary Storage: ${isCloudinaryConfigured ? 'Ready (Cloudinary Connected)' : 'Pending (Add CLOUDINARY_CLOUD_NAME & CLOUDINARY_API_KEY to server/.env)'}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use!`);
    console.error(`Another instance of the server is already running on port ${PORT}.`);
    console.error(`Your backend is active and healthy at: http://localhost:${PORT}/api/health\n`);
  } else {
    console.error('Server error:', err);
  }
});
