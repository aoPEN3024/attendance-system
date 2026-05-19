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

  punch: (type, date, time, siteId, breaks, substituteType) =>
    gasRequest({ action: 'attendance/punch', type, date, time, siteId, ...breaks, ...(substituteType ? { substituteType } : {}) }),

  apply: (date, clockIn, clockOut, siteId, breaks, reason, substituteType) =>
    gasRequest({ action: 'attendance/apply', date, clockIn, clockOut, siteId, ...breaks, reason, ...(substituteType ? { substituteType } : {}) }),

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

  adminOpen: (yearMonth) =>
    gasRequest({ action: 'admin/open', yearMonth }),

  sites: () => gasRequest({ action: 'sites/list' }),

  substituteBalance: () =>
    gasRequest({ action: 'attendance/substitute/balance' }),

  adminExportCsv: (yearMonth) => {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams({ action: 'admin/export/csv', token, yearMonth }).toString();
    window.open(`${GAS_URL}?${query}`);
  },

  adminEmployeesList: () =>
    gasRequest({ action: 'admin/employees/list' }),

  adminEmployeeAdd: (employeeId, name, password, role, hireDate) =>
    gasRequest({ action: 'admin/employee/add', employeeId, name, password, role, hireDate }),

  adminEmployeeEdit: (employeeId, name, role, hireDate) =>
    gasRequest({ action: 'admin/employee/edit', employeeId, name, role, hireDate }),

  adminEmployeePassword: (employeeId, newPassword) =>
    gasRequest({ action: 'admin/employee/password', employeeId, newPassword }),

  adminEmployeeToggle: (employeeId) =>
    gasRequest({ action: 'admin/employee/toggle', employeeId }),

  adminSitesList: () =>
    gasRequest({ action: 'admin/sites/list' }),

  adminSiteAdd: (siteId, siteName) =>
    gasRequest({ action: 'admin/site/add', siteId, siteName }),

  adminSiteEdit: (siteId, siteName) =>
    gasRequest({ action: 'admin/site/edit', siteId, siteName }),

  adminSiteToggle: (siteId) =>
    gasRequest({ action: 'admin/site/toggle', siteId }),
};