const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

dotenv.config({ path: __dirname + '/../../.env' });
const connectDB = require('../config/db');
const Holiday = require('../models/Holiday');
const User = require('../models/User');

const standardHolidays = [
  {
    name: 'New Year\'s Day',
    date: '2026-01-01',
    description: 'First day of the new calendar year',
    type: 'Company Holiday',
    applicability: 'All',
    isRecurring: true,
    paid: true
  },
  {
    name: 'Republic Day',
    date: '2026-01-26',
    description: 'Honours the date on which the Constitution of India came into effect',
    type: 'National Holiday',
    applicability: 'All',
    isRecurring: true,
    paid: true
  },
  {
    name: 'Holi Festival',
    date: '2026-03-04',
    description: 'Festival of Spring, Colours, and Love',
    type: 'Festival Holiday',
    applicability: 'All',
    isRecurring: true,
    paid: true
  },
  {
    name: 'Eid-ul-Fitr',
    date: '2026-03-20',
    description: 'Celebration marking the conclusion of Ramadan',
    type: 'Festival Holiday',
    applicability: 'All',
    isRecurring: false,
    paid: true
  },
  {
    name: 'Dr. B.R. Ambedkar Jayanti',
    date: '2026-04-14',
    description: 'Birth anniversary of Babasaheb Ambedkar, principal architect of the Indian Constitution',
    type: 'Public Holiday',
    applicability: 'All',
    isRecurring: true,
    paid: true
  },
  {
    name: 'Maharashtra Day / Labour Day',
    date: '2026-05-01',
    description: 'International Workers\' Day and state foundation holiday',
    type: 'Public Holiday',
    applicability: 'All',
    isRecurring: true,
    paid: true
  },
  {
    name: 'Independence Day',
    date: '2026-08-15',
    description: 'Commemorates the nation\'s independence from the United Kingdom',
    type: 'National Holiday',
    applicability: 'All',
    isRecurring: true,
    paid: true
  },
  {
    name: 'Mahatma Gandhi Jayanti',
    date: '2026-10-02',
    description: 'National holiday commemorating the birth of Mohandas Karamchand Gandhi',
    type: 'National Holiday',
    applicability: 'All',
    isRecurring: true,
    paid: true
  },
  {
    name: 'Dussehra (Vijaya Dashami)',
    date: '2026-10-20',
    description: 'Celebrates the victory of good over evil',
    type: 'Festival Holiday',
    applicability: 'All',
    isRecurring: false,
    paid: true
  },
  {
    name: 'NX Work OS Foundation Day',
    date: '2026-11-08',
    description: 'Annual corporate celebration and awards day',
    type: 'Company Holiday',
    applicability: 'All',
    isRecurring: true,
    paid: true
  },
  {
    name: 'Diwali Festival',
    date: '2026-11-12',
    description: 'The Festival of Lights celebrating light over darkness and knowledge over ignorance',
    type: 'Festival Holiday',
    applicability: 'All',
    isRecurring: false,
    paid: true
  },
  {
    name: 'Christmas Day',
    date: '2026-12-25',
    description: 'Commemoration of the birth of Jesus Christ',
    type: 'Public Holiday',
    applicability: 'All',
    isRecurring: true,
    paid: true
  }
];

const seedHolidays = async () => {
  try {
    await connectDB();
    console.log('[Seed Holidays] Connected to MongoDB');

    const hrUser = await User.findOne({ role: 'HR' });
    const createdBy = hrUser ? hrUser._id : null;

    let inserted = 0;
    let updated = 0;

    for (const h of standardHolidays) {
      const existing = await Holiday.findOne({
        date: h.date,
        name: h.name
      });

      if (!existing) {
        await Holiday.create({
          ...h,
          createdBy
        });
        inserted++;
      } else {
        existing.description = h.description;
        existing.type = h.type;
        existing.applicability = h.applicability;
        existing.isRecurring = h.isRecurring;
        existing.paid = h.paid;
        await existing.save();
        updated++;
      }
    }

    console.log(`[Seed Holidays] Done! Inserted: ${inserted}, Updated: ${updated}`);
    const total = await Holiday.countDocuments();
    console.log(`[Seed Holidays] Total holidays now in DB: ${total}`);
    process.exit(0);
  } catch (err) {
    console.error('[Seed Holidays] Error:', err);
    process.exit(1);
  }
};

seedHolidays();

