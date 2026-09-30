import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'SUPABASE_URL',
  'JWT_SECRET',
  'FRONTEND_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_EMAIL',
  'SMTP_PASS'
];

const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
if (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  missingEnvVars.push('SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
}

if (missingEnvVars.length > 0) {
  console.warn(`[Config] Missing environment variables: ${missingEnvVars.join(', ')}`);
}

const [
  { default: authRoutes },
  { default: adminRoutes },
  { default: teacherRoutes },
  { default: studentRoutes },
  { default: uploadRoutes },
  { isSupabaseConfigured, db },
  { realtimeBus },
  { isCloudinaryConfigured }
] = await Promise.all([
  import('./routes/auth.js'),
  import('./routes/admin.js'),
  import('./routes/teacher.js'),
  import('./routes/student.js'),
  import('./routes/upload.js'),
  import('./config/db.js'),
  import('./config/realtime.js'),
  import('./config/cloudinary.js')
]);

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const configuredOrigins = (process.env.FRONTEND_URL || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const localDevelopmentOrigin = /^http:\/\/localhost:\d+$/;
    const allowedOrigins = new Set([
      'http://localhost:5173',
      'http://localhost:5174',
      ...configuredOrigins
    ]);
    if (!origin || allowedOrigins.has(origin) || localDevelopmentOrigin.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    databaseMode: isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Not Configured',
    storageMode: isCloudinaryConfigured ? 'Cloudinary Cloud Storage' : 'Cloudinary Pending Configuration'
  });
});

// SSE
app.get('/api/realtime/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`data: ${JSON.stringify({
    type: 'CONNECTED',
    timestamp: new Date().toISOString(),
    isSupabaseConfigured
  })}\n\n`);

  const onRealtimeChange = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  realtimeBus.on('change', onRealtimeChange);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    realtimeBus.off('change', onRealtimeChange);
  });
});

// Stats
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/upload', uploadRoutes);

// 404
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// ✅ GLOBAL ERROR LOGGING (added)
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

// ✅ FIXED: ALWAYS START SERVER (REMOVED NODE_ENV CONDITION)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;