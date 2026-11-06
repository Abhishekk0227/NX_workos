const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported
}

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const AttendanceService = require('../services/attendanceService');

async function fixNotificationTimezones() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in environment');
      process.exit(1);
    }

    console.log('[Fix Notifications] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Fix Notifications] Connected successfully.');

    const notifications = await Notification.find({
      $or: [
        { type: 'Attendance' },
        { title: { $in: ['Employee Punched In', 'Employee Punched Out'] } }
      ]
    }).sort({ createdAt: -1 });

    console.log(`[Fix Notifications] Found ${notifications.length} attendance notifications to inspect.`);

    let updatedCount = 0;

    for (const notif of notifications) {
      const originalMessage = notif.message;
      if (!originalMessage) continue;

      const dateToUse = notif.createdAt || new Date();
      const istTime = AttendanceService.formatTime(dateToUse, {}, 'Asia/Kolkata');

      let newMessage = originalMessage;

      if (notif.title === 'Employee Punched In' || originalMessage.includes('punched in at')) {
        newMessage = originalMessage.replace(
          /(punched in at\s+)\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/i,
          (match, prefix) => `${prefix}${istTime}`
        );
      } else if (notif.title === 'Employee Punched Out' || originalMessage.includes('punched out at')) {
        newMessage = originalMessage.replace(
          /(punched out at\s+)\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/i,
          (match, prefix) => `${prefix}${istTime}`
        );
      }

      if (newMessage !== originalMessage) {
        notif.message = newMessage;
        await notif.save();
        updatedCount++;
        console.log(`[Updated] (${notif.createdAt?.toISOString()})\n  OLD: "${originalMessage}"\n  NEW: "${newMessage}"\n`);
      }
    }

    console.log(`[Fix Notifications] Complete! Successfully updated ${updatedCount} notifications to IST.`);
    process.exit(0);
  } catch (err) {
    console.error('[Fix Notifications Error]:', err);
    process.exit(1);
  }
}

fixNotificationTimezones();
