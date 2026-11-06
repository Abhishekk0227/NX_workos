const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const AttendanceService = require('../services/attendanceService');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const records = await Attendance.find().sort({ updatedAt: -1 }).limit(10).populate('employee');
  for (const r of records) {
    console.log({
      id: r._id,
      name: r.employee?.fullName,
      date: r.date,
      punchInIST: r.punchInIST || AttendanceService.toISTISOString(r.punchIn),
      punchOutIST: r.punchOutIST || AttendanceService.toISTISOString(r.punchOut),
      punchInTime: r.punchInTime || (r.punchIn ? AttendanceService.formatTime(r.punchIn, {}, 'Asia/Kolkata') : null),
      punchOutTime: r.punchOutTime || (r.punchOut ? AttendanceService.formatTime(r.punchOut, {}, 'Asia/Kolkata') : null),
      actualWorkingHours: r.actualWorkingHours,
      status: r.status,
      lateMinutes: r.lateMinutes
    });
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
