const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Ensure process default timezone is Asia/Kolkata
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

// Global serialization: Convert all Date objects thrown in JSON API responses to IST (+05:30)
Date.prototype.toJSON = function () {
  if (isNaN(this.getTime())) return null;
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(this.getTime() + istOffsetMs);
  return istDate.toISOString().replace('Z', '+05:30');
};

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
    version: '2.0.0',
    timezone: 'Asia/Kolkata (IST)',
    message: 'NX Work OS Backend is running successfully',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login',
      employees: '/api/employees',
      shifts: '/api/shifts',
      attendance: '/api/attendance',
      holidays: '/api/holidays',
      reminders: '/api/reminders',
      tasks: '/api/tasks',
      reports: '/api/reports',
      payroll: '/api/payroll'
    },
    timestamp: new Date().toISOString()
  });
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'NX Work OS',
    version: '2.0.0',
    timezone: 'Asia/Kolkata (IST)',
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
app.use('/api/holidays', require('./routes/holidayRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
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

// Setup background automated checks
const startBackgroundWorkers = () => {
  const AttendanceService = require('./services/attendanceService');
  const Reminder = require('./models/Reminder');
  const NotificationService = require('./services/notificationService');

  // 1. Periodic Auto Punch-Out check (runs immediately on start + every 5 minutes)
  AttendanceService.processAutoPunchOut().catch((err) =>
    console.warn('[Auto Punch-Out Initial Run Error]:', err.message)
  );
  setInterval(async () => {
    try {
      await AttendanceService.processAutoPunchOut();
    } catch (err) {
      console.warn('[Auto Punch-Out Worker Error]:', err.message);
    }
  }, 5 * 60 * 1000);

  // 2. Periodic Reminder Trigger check (runs every 1 minute)
  setInterval(async () => {
    try {
      const now = new Date();
      const dueReminders = await Reminder.find({
        status: 'Pending',
        isTriggered: false,
        remindAt: { $lte: now }
      }).populate('user');

      for (const r of dueReminders) {
        r.isTriggered = true;
        r.triggeredAt = now;
        await r.save();

        if (r.user) {
          await NotificationService.send({
            recipient: r.user._id,
            title: `Reminder: ${r.title}`,
            message: r.description || `Scheduled for ${r.date} at ${r.time} (${r.type})`,
            type: 'Reminder',
            link: r.linkedTask ? '/employee/tasks' : '/'
          });
        }
      }
    } catch (err) {
      console.warn('[Reminder Worker Error]:', err.message);
    }
  }, 60 * 1000);
};

// Connect to Database and start listener in non-serverless environments
if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[NX Work OS Server] Running on http://localhost:${PORT}`);
      startBackgroundWorkers();
    });
  }).catch((err) => {
    console.error('Initial DB connection failed:', err.message);
  });
}

module.exports = app;
