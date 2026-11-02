const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Ensure process default timezone is Asia/Kolkata
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root Server Status Endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    system: 'NX Work OS API Server',
    status: 'online',
    version: '1.0.0',
    message: 'NX Work OS Backend is running successfully on Vercel',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login',
      employees: '/api/employees',
      shifts: '/api/shifts',
      attendance: '/api/attendance'
    },
    timestamp: new Date().toISOString()
  });
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'NX Work OS',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Middleware to ensure DB connection is ready before handling requests (Serverless optimization)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Route mounts
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/broadcasts', require('./routes/broadcastRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to Database and start listener in non-serverless environments
if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[NX Work OS Server] Running on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Initial DB connection failed:', err.message);
  });
}

module.exports = app;
