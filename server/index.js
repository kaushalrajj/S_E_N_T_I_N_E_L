import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_EMAIL',
  'SMTP_PASS'
];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.warn(`[Config] Missing environment variables: ${missingEnvVars.join(', ')}`);
}

const [{ default: authRoutes }, { default: adminRoutes }, { default: teacherRoutes }, { default: studentRoutes }, { default: uploadRoutes }, { isSupabaseConfigured, db }, { realtimeBus }, { isCloudinaryConfigured }] = await Promise.all([
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
  origin: '*',
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

// ⚠️ SSE (may not work on Vercel)
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

// ✅ LOCAL RUN FIX (IMPORTANT)
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}

// ✅ EXPORT FOR VERCEL
export default app;