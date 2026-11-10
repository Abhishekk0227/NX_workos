export const resolveNotificationRoute = (notif, userRole) => {
  if (notif?.link && notif.link.trim() !== '') return notif.link;
  const isHR = userRole === 'HR';
  const type = (notif?.type || '').toLowerCase();
  const title = (notif?.title || '').toLowerCase();

  if (type === 'task' || title.includes('task')) {
    return isHR ? '/hr/tasks-reports' : '/employee/tasks';
  }
  if (type === 'attendance' || title.includes('punch') || title.includes('attendance')) {
    return isHR ? '/hr/attendance' : '/employee/attendance';
  }
  if (type === 'leave' || title.includes('leave')) {
    return isHR ? '/hr/leave' : '/employee/leave';
  }
  if (type === 'payroll' || title.includes('salary') || title.includes('payroll')) {
    return isHR ? '/hr/payroll' : '/employee/profile';
  }
  if (type === 'correction') {
    return isHR ? '/hr/attendance' : '/employee/attendance';
  }
  if (type === 'holiday' || title.includes('holiday')) {
    return isHR ? '/hr/holidays' : '/employee/home';
  }
  if (type === 'reminder' || title.includes('reminder')) {
    return isHR ? '/hr/dashboard' : '/employee/home';
  }
  if (type === 'short attendance' || title.includes('short attendance')) {
    return isHR ? '/hr/attendance' : '/employee/attendance';
  }
  if (title.includes('notice') || title.includes('broadcast') || type === 'system') {
    return isHR ? '/hr/broadcast' : '/employee/notices';
  }

  return isHR ? '/hr/dashboard' : '/employee/home';
};

