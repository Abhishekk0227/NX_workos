const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

const AttendanceService = require('../services/attendanceService');
const Attendance = require('../models/Attendance');
const ShiftTemplate = require('../models/ShiftTemplate');
const SystemSetting = require('../models/SystemSetting');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const settings = await SystemSetting.findOne().lean();
  const shifts = await ShiftTemplate.find().lean();
  const shiftMap = {};
  shifts.forEach(s => { shiftMap[s._id.toString()] = s; });

  const records = await Attendance.find({ punchIn: { $ne: null }, punchOut: { $ne: null } });
  console.log('Found records with punchIn & punchOut:', records.length);

  for (const rec of records) {
    const shift = rec.shift ? shiftMap[rec.shift.toString()] : null;
    const oldHours = rec.actualWorkingHours;
    const oldStatus = rec.status;
    const oldLate = rec.lateMinutes;
    const oldEarly = rec.earlyMinutes;

    const metrics = AttendanceService.calculateAttendanceMetrics(rec.punchIn, rec.punchOut, shift, settings);

    rec.actualWorkingHours = metrics.actualWorkingHours;
    rec.lateMinutes = metrics.lateMinutes;
    rec.earlyMinutes = metrics.earlyMinutes;
    rec.status = metrics.status;
    rec.isIncomplete = metrics.status === 'Incomplete';

    await rec.save();

    console.log(`Record ${rec._id} (${rec.date}):`);
    console.log(`  Hours: ${oldHours} -> ${rec.actualWorkingHours}`);
    console.log(`  Status: ${oldStatus} -> ${rec.status}`);
    console.log(`  Late: ${oldLate} -> ${rec.lateMinutes} mins`);
    console.log(`  Early: ${oldEarly} -> ${rec.earlyMinutes} mins`);
  }

  console.log('Recalculation complete.');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration Error:', err);
  process.exit(1);
});
