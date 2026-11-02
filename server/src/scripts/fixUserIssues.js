const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

const AttendanceService = require('../services/attendanceService');
const Attendance = require('../models/Attendance');
const ShiftTemplate = require('../models/ShiftTemplate');
const SystemSetting = require('../models/SystemSetting');
const Task = require('../models/Task');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Clean up duplicate tasks (same employee, same title, within 2 seconds of each other)
  const allTasks = await Task.find().sort({ createdAt: -1 });
  const deletedTaskIds = [];
  for (let i = 0; i < allTasks.length; i++) {
    for (let j = i + 1; j < allTasks.length; j++) {
      const t1 = allTasks[i];
      const t2 = allTasks[j];
      if (
        t1.employee && t2.employee &&
        t1.employee.toString() === t2.employee.toString() &&
        t1.title === t2.title &&
        Math.abs(new Date(t1.createdAt).getTime() - new Date(t2.createdAt).getTime()) < 5000 &&
        !deletedTaskIds.includes(t1._id.toString())
      ) {
        console.log(`Deleting duplicate task: ${t1._id} ("${t1.title}") duplicate of ${t2._id}`);
        await Task.findByIdAndDelete(t1._id);
        deletedTaskIds.push(t1._id.toString());
        break;
      }
    }
  }

  // 2. Fix Hariom Sagitra attendance record
  const hariomRecord = await Attendance.findById('6ae8142aff865c9ec9424288');
  if (hariomRecord) {
    const settings = await SystemSetting.findOne().lean();
    const shift = hariomRecord.shift ? await ShiftTemplate.findById(hariomRecord.shift).lean() : null;

    const metrics = AttendanceService.calculateAttendanceMetrics(
      hariomRecord.punchIn,
      hariomRecord.punchOut,
      shift,
      settings
    );

    console.log('Hariom metrics before:');
    console.log({
      actualWorkingHours: hariomRecord.actualWorkingHours,
      lateMinutes: hariomRecord.lateMinutes,
      status: hariomRecord.status
    });

    hariomRecord.actualWorkingHours = metrics.actualWorkingHours;
    hariomRecord.lateMinutes = metrics.lateMinutes;
    hariomRecord.earlyMinutes = metrics.earlyMinutes;
    hariomRecord.status = metrics.status;
    hariomRecord.isIncomplete = metrics.status === 'Incomplete';

    await hariomRecord.save();

    console.log('Hariom metrics after recalculation:');
    console.log({
      actualWorkingHours: hariomRecord.actualWorkingHours,
      lateMinutes: hariomRecord.lateMinutes,
      earlyMinutes: hariomRecord.earlyMinutes,
      status: hariomRecord.status
    });
  }

  console.log('Fix script complete.');
  process.exit(0);
}

run().catch(err => {
  console.error('Fix script error:', err);
  process.exit(1);
});
