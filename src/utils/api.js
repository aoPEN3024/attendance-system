const GAS_URL = import.meta.env.VITE_GAS_URL;

async function gasRequest(params) {
  const token = localStorage.getItem('token');
  const allParams = token ? { ...params, token } : params;
  const query = new URLSearchParams(allParams).toString();
  const url = `${GAS_URL}?${query}`;
  
  const res = await fetch(url, {
    redirect: 'follow',
    mode: 'cors',
  });
  
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'エラーが発生しました');
  return json.data;
}

export const api = {
  login: (employeeId, password) =>
    gasRequest({ action: 'auth/login', employeeId, password }),

  punch: (type, date, time, siteId, breaks) =>
    gasRequest({ action: 'attendance/punch', type, date, time, siteId, ...breaks }),

  apply: (date, clockIn, clockOut, siteId, breaks, reason) =>
    gasRequest({ action: 'attendance/apply', date, clockIn, clockOut, siteId, ...breaks, reason }),

  today: (date) =>
    gasRequest({ action: 'attendance/today', date }),

  monthly: (yearMonth) =>
    gasRequest({ action: 'attendance/monthly', yearMonth }),

  leaveApply: (date, reason) =>
    gasRequest({ action: 'leave/apply', date, reason }),

  leaveGrant: (targetEmployeeId, days, note, grantAll = false) =>
    gasRequest({ action: 'admin/leave/grant', targetEmployeeId, days, note, grantAll }),

  adminEmployeesMonthly: (yearMonth) =>
    gasRequest({ action: 'admin/employees/monthly', yearMonth }),

  adminEmployeeMonthly: (targetEmployeeId, yearMonth) =>
    gasRequest({ action: 'admin/employee/monthly', targetEmployeeId, yearMonth }),

  adminEdit: (targetEmployeeId, date, fields) =>
    gasRequest({ action: 'admin/attendance/edit', targetEmployeeId, date, ...fields }),

  adminApprove: (logId, result, comment) =>
    gasRequest({ action: 'admin/approve', logId, result, comment }),

  adminClose: (yearMonth) =>
    gasRequest({ action: 'admin/close', yearMonth }),

  sites: () => gasRequest({ action: 'sites/list' }),
  adminExportCsv: (yearMonth) => {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams({ action: 'admin/export/csv', token, yearMonth }).toString();
    window.open(`${GAS_URL}?${query}`);
  },
};