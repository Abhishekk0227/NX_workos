import React from 'react';

/**
 * Base Shimmer Box Primitive
 */
export function Shimmer({ className = '', style = {} }) {
  return <div className={`shimmer rounded-md ${className}`} style={style} />;
}

/**
 * Shimmer for Employee Home / Main Screen
 */
export function HomeShimmer() {
  return (
    <div className="space-y-4 max-w-lg mx-auto sm:max-w-2xl lg:max-w-4xl pb-6 animate-in fade-in duration-200">
      {/* 1. Top Greeting Card Shimmer */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs flex items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Avatar Circle */}
          <Shimmer className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <Shimmer className="h-3 w-20 rounded-md" />
            <Shimmer className="h-5 w-44 rounded-md" />
            <Shimmer className="h-3 w-32 rounded-md" />
          </div>
        </div>
      </div>

      {/* 2. Today's Shift Card Shimmer */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Shimmer className="w-10 h-10 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Shimmer className="h-3 w-24 rounded-md" />
              <Shimmer className="h-4 w-36 rounded-md" />
            </div>
          </div>
          <Shimmer className="h-6 w-24 rounded-xl shrink-0" />
        </div>

        {/* Big Rounded Pill Button Shimmer */}
        <Shimmer className="w-full h-14 rounded-full" />
      </div>

      {/* 3. 4-Card Quick Metrics Grid Shimmer */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs flex flex-col justify-between h-32"
          >
            <Shimmer className="w-10 h-10 rounded-2xl mb-2" />
            <div className="space-y-1.5">
              <Shimmer className="h-3 w-14 rounded-md" />
              <Shimmer className="h-7 w-16 rounded-md" />
              <Shimmer className="h-2.5 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. Today's Tasks Shimmer */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-1">
          <Shimmer className="h-4 w-28 rounded-md" />
          <Shimmer className="h-3 w-16 rounded-md" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Shimmer className="w-5 h-5 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Shimmer className="h-3.5 w-3/4 rounded-md" />
                  <Shimmer className="h-2.5 w-1/3 rounded-md" />
                </div>
              </div>
              <Shimmer className="h-5 w-16 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Shimmer for Attendance (Calendar + Logs)
 */
export function AttendanceShimmer() {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Date Pill & Controls */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <Shimmer className="w-4 h-4 rounded-md" />
          <Shimmer className="h-4 w-32 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="w-8 h-8 rounded-xl" />
          <Shimmer className="w-8 h-8 rounded-xl" />
        </div>
      </div>

      {/* Calendar Grid Box */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 pb-2 border-b border-slate-100">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Shimmer key={i} className="h-4 w-8 mx-auto rounded-md" />
          ))}
        </div>
        {/* Day Cells (5 rows of 7) */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, idx) => (
            <div
              key={idx}
              className="h-10 sm:h-12 bg-slate-50/70 rounded-2xl flex flex-col items-center justify-center p-1 relative"
            >
              <Shimmer className="h-3 w-4 rounded-md mb-1" />
              {idx % 3 === 0 && <Shimmer className="w-1.5 h-1.5 rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1.5">
            <Shimmer className="h-3 w-16 rounded-md" />
            <Shimmer className="h-6 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shimmer for Tasks Page
 */
export function TasksShimmer() {
  return (
    <div className="space-y-4 max-w-lg mx-auto sm:max-w-2xl lg:max-w-4xl pb-12 animate-in fade-in duration-200">
      {/* Title */}
      <div className="space-y-1.5">
        <Shimmer className="h-7 w-36 rounded-md" />
        <Shimmer className="h-3.5 w-48 rounded-md" />
      </div>

      {/* Top Segmented Tabs */}
      <div className="bg-slate-100/90 p-1 rounded-2xl flex max-w-sm gap-2">
        <Shimmer className="flex-1 h-8 rounded-xl" />
        <Shimmer className="flex-1 h-8 rounded-xl" />
      </div>

      {/* 4 Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-100 shadow-2xs flex items-center gap-3">
            <Shimmer className="w-11 h-11 rounded-2xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Shimmer className="h-3 w-12 rounded-md" />
              <Shimmer className="h-6 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-3">
        <Shimmer className="flex-1 h-9 rounded-xl" />
        <Shimmer className="w-28 h-9 rounded-xl" />
      </div>

      {/* Task List Items */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Shimmer className="w-5 h-5 rounded-md mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1">
                <Shimmer className="h-4 w-3/5 rounded-md" />
                <Shimmer className="h-3 w-4/5 rounded-md" />
                <div className="flex items-center gap-2 pt-1">
                  <Shimmer className="h-4 w-16 rounded-full" />
                  <Shimmer className="h-4 w-20 rounded-md" />
                </div>
              </div>
            </div>
            <Shimmer className="w-6 h-6 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shimmer for Leave Management
 */
export function LeaveShimmer() {
  return (
    <div className="space-y-4 max-w-lg mx-auto sm:max-w-2xl lg:max-w-4xl pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <Shimmer className="h-7 w-44 rounded-md" />
          <Shimmer className="h-3 w-56 rounded-md" />
        </div>
        <Shimmer className="h-10 w-32 rounded-xl shrink-0" />
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl max-w-sm gap-2">
        <Shimmer className="flex-1 h-8 rounded-xl" />
        <Shimmer className="flex-1 h-8 rounded-xl" />
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <Shimmer className="w-10 h-10 rounded-2xl" />
              <Shimmer className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-1">
              <Shimmer className="h-7 w-12 rounded-md" />
              <Shimmer className="h-3 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Table Box */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
        <Shimmer className="h-4 w-32 rounded-md mb-2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 bg-slate-50/70 rounded-2xl flex items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <Shimmer className="h-3.5 w-40 rounded-md" />
              <Shimmer className="h-2.5 w-24 rounded-md" />
            </div>
            <Shimmer className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shimmer for Generic Tables (HR Attendance, Employees, Payroll, Tasks & Reports)
 */
export function TableShimmer({ rows = 6, cols = 5 }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden animate-in fade-in duration-200">
      {/* Table Header Filter Shimmer */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
        <Shimmer className="h-8 w-48 rounded-xl" />
        <div className="flex items-center gap-2">
          <Shimmer className="h-8 w-24 rounded-xl" />
          <Shimmer className="h-8 w-24 rounded-xl" />
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80">
              {Array.from({ length: cols }).map((_, cIdx) => (
                <th key={cIdx} className="py-3.5 px-4">
                  <Shimmer className="h-3 w-20 rounded-md" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50">
                {Array.from({ length: cols }).map((_, cIdx) => (
                  <td key={cIdx} className="py-3.5 px-4">
                    {cIdx === 0 ? (
                      <div className="flex items-center gap-2.5">
                        <Shimmer className="w-8 h-8 rounded-full shrink-0" />
                        <div className="space-y-1 flex-1">
                          <Shimmer className="h-3 w-24 rounded-md" />
                          <Shimmer className="h-2.5 w-16 rounded-md" />
                        </div>
                      </div>
                    ) : cIdx === cols - 1 ? (
                      <Shimmer className="h-7 w-16 rounded-lg ml-auto" />
                    ) : (
                      <Shimmer className="h-3 w-20 rounded-md" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Shimmer for HR Dashboard
 */
export function HRDashboardShimmer() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="space-y-1.5">
        <Shimmer className="h-7 w-48 rounded-md" />
        <Shimmer className="h-3.5 w-64 rounded-md" />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <Shimmer className="w-10 h-10 rounded-xl" />
              <Shimmer className="h-4 w-12 rounded-full" />
            </div>
            <div className="space-y-1">
              <Shimmer className="h-7 w-16 rounded-md" />
              <Shimmer className="h-3 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts / Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Shimmer className="h-5 w-36 rounded-md" />
            <Shimmer className="h-4 w-20 rounded-md" />
          </div>
          <Shimmer className="h-56 w-full rounded-xl" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <Shimmer className="h-5 w-32 rounded-md" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Shimmer className="w-7 h-7 rounded-full" />
                  <Shimmer className="h-3 w-24 rounded-md" />
                </div>
                <Shimmer className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Shimmer for Notice Board & Broadcasts
 */
export function NoticeShimmer({ count = 3 }) {
  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="space-y-1.5">
        <Shimmer className="h-7 w-40 rounded-md" />
        <Shimmer className="h-3.5 w-60 rounded-md" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-8 w-24 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Notice Cards */}
      <div className="space-y-3.5">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Shimmer className="w-8 h-8 rounded-xl" />
                <div className="space-y-1">
                  <Shimmer className="h-3.5 w-28 rounded-md" />
                  <Shimmer className="h-2.5 w-20 rounded-md" />
                </div>
              </div>
              <Shimmer className="h-5 w-16 rounded-full" />
            </div>

            <div className="space-y-2 pt-1">
              <Shimmer className="h-4 w-4/5 rounded-md" />
              <Shimmer className="h-3 w-full rounded-md" />
              <Shimmer className="h-3 w-2/3 rounded-md" />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Shimmer className="h-3 w-32 rounded-md" />
              <Shimmer className="h-7 w-24 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shimmer for Mobile Card Lists
 */
export function CardListShimmer({ count = 4 }) {
  return (
    <div className="space-y-2.5 animate-in fade-in duration-200">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shimmer className="w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Shimmer className="h-3.5 w-28 rounded-md" />
                <Shimmer className="h-2.5 w-20 rounded-md" />
              </div>
            </div>
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Shimmer className="h-10 rounded-xl" />
            <Shimmer className="h-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full Page Splash / Boot Shimmer
 */
export function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-4 animate-in fade-in duration-150">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl tracking-wider">
        NX
      </div>
      <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden relative">
        <div className="shimmer h-full w-full rounded-full" />
      </div>
      <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">NX WorkOS</p>
    </div>
  );
}

export default Shimmer;
