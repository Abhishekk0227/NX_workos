const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

const AttendanceService = require('../services/attendanceService');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const ShiftTemplate = require('../models/ShiftTemplate');
const SystemSetting = require('../models/SystemSetting');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const settings = await SystemSetting.findOne().lean();
  const records = await Attendance.find().populate('shift').populate('employee');

  console.log(`Checking ${records.length} attendance records...`);

  let updatedCount = 0;
  for (const r of records) {
    if (r.punchIn && r.punchOut) {
      const metrics = AttendanceService.calculateAttendanceMetrics(r.punchIn, r.punchOut, r.shift, settings);
      const oldHours = r.actualWorkingHours;
      const oldFormatted = r.workingHoursFormatted;
      
      r.actualWorkingHours = metrics.actualWorkingHours;
      r.workingHoursFormatted = metrics.workingHoursFormatted;
      r.lateMinutes = metrics.lateMinutes;
      r.earlyMinutes = metrics.earlyMinutes;
      if (r.status !== 'Half Day' || metrics.actualWorkingHours >= 6) {
        r.status = metrics.status;
      }

      await r.save();
      console.log(`Updated ${r.employee?.fullName} (${r.date}): ${oldHours} (${oldFormatted}) -> ${r.actualWorkingHours} (${r.workingHoursFormatted} hrs) [status: ${r.status}]`);
      updatedCount++;
    }
  }

  console.log(`Successfully recalculated ${updatedCount} records.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
