const mongoose = require('mongoose');
const dns = require('dns');

// On Windows or certain ISP DNS servers, SRV lookup fails with querySrv ECONNREFUSED.
// Setting public DNS servers ensures Atlas SRV connection strings resolve properly.
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore fallback error
}

let cachedPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nx_work_os';
    cachedPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000
    });
    const conn = await cachedPromise;
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Pre-register all Mongoose models so .populate() never throws MissingSchemaError
    require('../models/ShiftTemplate');
    require('../models/Employee');
    require('../models/SalaryProfile');
    require('../models/PayrollRecord');
    require('../models/Attendance');
    require('../models/DailyReport');
    require('../models/LeaveRequest');
    require('../models/LeavePolicy');
    require('../models/LeaveLedger');
    require('../models/SystemSetting');
    require('../models/Task');
    require('../models/User');
    require('../models/Broadcast');
    require('../models/AuditLog');
    require('../models/Notification');

    return conn;
  } catch (error) {
    cachedPromise = null;
    console.error(`[MongoDB Error] Connection failed: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
