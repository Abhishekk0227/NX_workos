const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const DailyReport = require('../models/DailyReport');
const Notification = require('../models/Notification');
const AttendanceService = require('../services/attendanceService');

async function migrate() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI missing');
      process.exit(1);
    }

    console.log('[Migration] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Migration] Connected.');

    // 1. Migrate Attendance Records
    const attendances = await Attendance.find();
    console.log(`[Migration] Processing ${attendances.length} attendance records...`);
    let attCount = 0;
    for (const att of attendances) {
      let changed = false;
      if (att.punchIn && (!att.punchInIST || !att.punchInTime)) {
        att.punchInIST = AttendanceService.toISTISOString(att.punchIn);
        att.punchInTime = AttendanceService.formatTime(att.punchIn, {}, 'Asia/Kolkata');
        changed = true;
      }
      if (att.punchOut && (!att.punchOutIST || !att.punchOutTime)) {
        att.punchOutIST = AttendanceService.toISTISOString(att.punchOut);
        att.punchOutTime = AttendanceService.formatTime(att.punchOut, {}, 'Asia/Kolkata');
        changed = true;
      }
      if (changed) {
        await att.save();
        attCount++;
      }
    }
    console.log(`[Migration] Updated ${attCount} attendance records with permanent IST fields.`);

    // 2. Migrate Daily Reports
    const reports = await DailyReport.find();
    console.log(`[Migration] Processing ${reports.length} daily reports...`);
    let repCount = 0;
    for (const rep of reports) {
      if (rep.submittedAt && (!rep.submittedAtIST || !rep.submittedTime)) {
        rep.submittedAtIST = AttendanceService.toISTISOString(rep.submittedAt);
        rep.submittedTime = AttendanceService.formatTime(rep.submittedAt, {}, 'Asia/Kolkata');
        await rep.save();
        repCount++;
      }
    }
    console.log(`[Migration] Updated ${repCount} daily reports with permanent IST fields.`);

    // 3. Migrate Notifications
    const notifications = await Notification.find();
    console.log(`[Migration] Processing ${notifications.length} notifications...`);
    let notifCount = 0;
    for (const notif of notifications) {
      if (notif.createdAt && (!notif.createdAtIST || !notif.createdAtTime)) {
        notif.createdAtIST = AttendanceService.toISTISOString(notif.createdAt);
        notif.createdAtTime = AttendanceService.formatTime(notif.createdAt, {}, 'Asia/Kolkata');
        await notif.save();
        notifCount++;
      }
    }
    console.log(`[Migration] Updated ${notifCount} notifications with permanent IST fields.`);

    console.log('[Migration] All records migrated to 100% IST storage successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]:', err);
    process.exit(1);
  }
}

migrate();
