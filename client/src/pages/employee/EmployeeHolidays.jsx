import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Info,
  Calendar,
  CheckCircle2,
  Clock,
  Building,
  Flag,
  HeartHandshake
} from 'lucide-react';
import api from '../../api/client';
import { TableShimmer } from '../../components/common/Shimmer';
import { formatDateIST } from '../../utils/timeUtils';

export default function EmployeeHolidays() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [holidays, setHolidays] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const [monthRes, upRes] = await Promise.allSettled([
        api.get(`/holidays?year=${year}&month=${month + 1}`),
        api.get('/holidays/upcoming')
      ]);

      if (monthRes.status === 'fulfilled') {
        setHolidays(monthRes.value.data?.holidays || []);
      }
      if (upRes.status === 'fulfilled') {
        setUpcomingHolidays(upRes.value.data?.holidays || []);
      }
    } catch (err) {
      console.error('Failed to load employee holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Map holidays by date string YYYY-MM-DD
  const holidayMap = {};
  holidays.forEach((h) => {
    holidayMap[h.date] = h;
    if (h.isRecurring && h.date) {
      const mmdd = h.date.slice(5);
      holidayMap[`${year}-${mmdd}`] = h;
    }
  });

  // Group multi-day holidays for list views
  const groupedHolidays = [];
  const seenGroupKeys = new Set();
  holidays.forEach((h) => {
    const groupKey = h.rangeGroupId || `${h.name}_${h.startDate || h.date}_${h.endDate || h.date}`;
    if (!seenGroupKeys.has(groupKey)) {
      seenGroupKeys.add(groupKey);
      groupedHolidays.push(h);
    }
  });

  const getHolidayBadgeColor = (type) => {
    switch (type) {
      case 'National Holiday':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'Festival Holiday':
        return 'bg-rose-100 text-rose-900 border-rose-200';
      case 'Public Holiday':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'Company Holiday':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      default:
        return 'bg-purple-100 text-purple-900 border-purple-200';
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-blue-600" /> Holiday Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official company, national, and festival holidays schedule for India (IST).
          </p>
        </div>

        <button
          onClick={handleToday}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
        >
          Jump to Current Month
        </button>
      </div>

      {/* Policy Reminder Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <span className="font-bold text-blue-900">Attendance & Leave Policy: </span>
          All scheduled holidays are <span className="font-bold text-emerald-700">100% Paid Leaves</span> and are
          never counted as Absent. If you punch in on a holiday date, your attendance is recorded as{' '}
          <span className="font-bold text-indigo-700">"Working on Holiday"</span> with eligible compensatory benefits.
        </div>
      </div>

      {/* Month Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm sm:text-base font-bold text-slate-900 min-w-[150px] text-center">
            {monthName}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Holidays in {currentDate.toLocaleString('en-US', { month: 'short' })}:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
            {groupedHolidays.length}
          </span>
        </div>
      </div>

      {/* Main Grid & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Calendar View (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider mb-2">
            <span className="text-rose-500">Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="h-20 sm:h-24 rounded-xl bg-slate-50/40" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const hol = holidayMap[dateStr];
              const isSunday = (firstDayIndex + i) % 7 === 0;
              const isToday =
                dayNum === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <div
                  key={dateStr}
                  onClick={() => hol && setSelectedHoliday(hol)}
                  className={`h-20 sm:h-24 p-2 rounded-xl border transition flex flex-col justify-between ${
                    hol
                      ? 'bg-gradient-to-br from-amber-50 to-orange-50/70 border-amber-300 text-amber-950 shadow-xs cursor-pointer hover:border-amber-400'
                      : isSunday
                      ? 'bg-slate-50/60 border-slate-100 text-slate-400'
                      : isToday
                      ? 'bg-blue-50/50 border-blue-400 text-blue-900 font-semibold'
                      : 'bg-white border-slate-200/70 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]'
                          : isSunday
                          ? 'text-rose-500'
                          : ''
                      }`}
                    >
                      {dayNum}
                    </span>
                    {hol && <Sparkles className="w-3 h-3 text-amber-600" />}
                  </div>

                  {hol ? (
                    <div className="mt-1">
                      <span className="text-[10px] sm:text-[11px] font-bold line-clamp-2 leading-tight text-amber-900">
                        {hol.name}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] text-amber-700/80 truncate">
                          {hol.type.replace(' Holiday', '')}
                        </span>
                        {hol.isMultiDay && (
                          <span className="text-[8px] bg-amber-200/80 text-amber-900 px-1 py-0.2 rounded font-semibold shrink-0">
                            Range
                          </span>
                        )}
                      </div>
                    </div>
                  ) : isSunday ? (
                    <span className="text-[9px] text-slate-400">Off</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Month Holidays + Upcoming List (1 Col) */}
        <div className="space-y-6">
          {/* Holidays in Selected Month */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>Holidays in {currentDate.toLocaleString('en-US', { month: 'short' })}</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                {groupedHolidays.length}
              </span>
            </h3>

            {loading ? (
              <div className="py-4">
                <TableShimmer rows={3} />
              </div>
            ) : groupedHolidays.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <PartyPopper className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-xs font-medium">No holidays scheduled for this month</p>
                <p className="text-[10px] text-slate-400 mt-1">Check upcoming holidays below</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {groupedHolidays.map((h) => {
                  const isMulti = h.isMultiDay || (h.startDate && h.endDate && h.startDate !== h.endDate);
                  const dayCount = h.totalDays || 1;

                  return (
                    <div
                      key={h._id || h.name}
                      onClick={() => setSelectedHoliday(h)}
                      className="p-3 bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-200/70 transition cursor-pointer space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{h.name}</h4>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          Paid
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                        {isMulti ? (
                          <>
                            <span>{formatDateIST(h.startDate || h.date)} – {formatDateIST(h.endDate || h.date)}</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              {dayCount} Days
                            </span>
                          </>
                        ) : (
                          <span>{formatDateIST(h.date)} (1 Day)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] pt-1">
                        <span className={`px-2 py-0.5 rounded font-semibold border ${getHolidayBadgeColor(h.type)}`}>
                          {h.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Holidays Year-round */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>Upcoming Holidays</span>
              <span className="text-[10px] text-slate-400 font-medium">Next celebrations</span>
            </h3>

            {upcomingHolidays.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No upcoming holidays scheduled</p>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {upcomingHolidays.slice(0, 6).map((hol) => {
                  const isMulti = hol.isMultiDay || (hol.startDate && hol.endDate && hol.startDate !== hol.endDate);
                  const displayDate = hol.startDate || hol.date;

                  return (
                    <div
                      key={hol._id || hol.name + hol.date}
                      onClick={() => setSelectedHoliday(hol)}
                      className="p-2.5 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-xl border border-emerald-100 flex items-center gap-3 cursor-pointer hover:border-emerald-300 transition"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold flex flex-col items-center justify-center shrink-0 shadow-xs">
                        <span className="text-xs leading-none">
                          {displayDate ? displayDate.split('-')[2] : '01'}
                        </span>
                        <span className="text-[8px] uppercase tracking-wider leading-none mt-0.5">
                          {displayDate
                            ? new Date(displayDate + 'T12:00:00+05:30').toLocaleDateString('en-US', { month: 'short' })
                            : ''}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 truncate leading-tight">
                          {hol.name}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1.5 truncate">
                          {isMulti ? (
                            <>
                              <span>{hol.totalDays} Days Range</span>
                              <span>•</span>
                            </>
                          ) : null}
                          <span>{hol.type.replace(' Holiday', '')}</span>
                          <span>•</span>
                          <span>100% Paid</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Holiday Details Modal */}
      {selectedHoliday && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/20 rounded-full">
                  {selectedHoliday.type}
                </span>
                <button
                  onClick={() => setSelectedHoliday(null)}
                  className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <h3 className="text-lg font-bold mt-2 leading-tight">{selectedHoliday.name}</h3>
              <p className="text-xs text-amber-100 mt-1">
                {selectedHoliday.isMultiDay || (selectedHoliday.startDate && selectedHoliday.endDate && selectedHoliday.startDate !== selectedHoliday.endDate)
                  ? `${formatDateIST(selectedHoliday.startDate || selectedHoliday.date)} – ${formatDateIST(selectedHoliday.endDate || selectedHoliday.date)} (${selectedHoliday.totalDays || 1} Days)`
                  : `${formatDateIST(selectedHoliday.date)} (1 Day)`}
              </p>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              {selectedHoliday.description && (
                <div>
                  <span className="font-bold text-slate-900 block mb-1">Details:</span>
                  <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                    {selectedHoliday.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Salary & Pay</span>
                  <span className="font-bold text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid (100%)
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Applicability</span>
                  <span className="font-bold text-slate-800 text-xs block mt-0.5">
                    {selectedHoliday.applicability === 'All' ? 'All Employees' : `${selectedHoliday.applicability} Specific`}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  This holiday is automatically synchronized with your attendance ledger. No leave request is required.
                </span>
              </div>

              <button
                onClick={() => setSelectedHoliday(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
