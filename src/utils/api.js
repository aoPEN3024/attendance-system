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
  console.log('レスポンス:', json);
  console.log('現在のtoken:', token);  // ← 追加
  console.log('code判定:', json.code === 401, 'token判定:', !!token);  // ← 追加
  if (!json.success) {
    if (json.code === 401 && token) {
      console.log('★認証エラー検知！リロードします');  // ← 追加
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('セッションの有効期限が切れました。再度ログインしてください。');
      window.location.reload();
      return;
    }
    throw new Error(json.error || 'エラーが発生しました');
  }
  return json.data;
}


export const api = {
  login: (employeeId, password) =>
    gasRequest({ action: 'auth/login', employeeId, password }),

  punch: (type, date, time, sites, breaks, substituteType) =>
    gasRequest({
      action: 'attendance/punch', type, date, time,
      site1Id: sites[0]?.siteId || '', site1Min: sites[0]?.minutes || 0,
      site2Id: sites[1]?.siteId || '', site2Min: sites[1]?.minutes || 0,
      site3Id: sites[2]?.siteId || '', site3Min: sites[2]?.minutes || 0,
      ...breaks,
      ...(substituteType ? { substituteType } : {}),
    }),

  apply: (date, clockIn, clockOut, sites, breaks, reason, substituteType) =>
    gasRequest({
      action: 'attendance/apply', date, clockIn, clockOut,
      site1Id: sites[0]?.siteId || '', site1Min: sites[0]?.minutes || 0,
      site2Id: sites[1]?.siteId || '', site2Min: sites[1]?.minutes || 0,
      site3Id: sites[2]?.siteId || '', site3Min: sites[2]?.minutes || 0,
      ...breaks, reason,
      ...(substituteType ? { substituteType } : {}),
    }),

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

  adminExportCsv: (yearMonth, type, targetEmployeeId) => {
    const token = localStorage.getItem('token');
    const params = { action: 'admin/export/csv', token, yearMonth, type };
    if (targetEmployeeId) params.targetEmployeeId = targetEmployeeId;
    const query = new URLSearchParams(params).toString();
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
  payslipList: () =>
    gasRequest({ action: 'payslip/list' }),

  payslipUpload: (targetEmployeeId) =>
    gasRequest({ action: 'payslip/upload', targetEmployeeId }),

  payslipDownload: (fileId) =>
    gasRequest({ action: 'payslip/download', fileId }),

  adminApproveAll: (targetEmployeeId, yearMonth) =>
    gasRequest({ action: 'admin/approve/all', targetEmployeeId, yearMonth }),

  changePassword: (currentPassword, newPassword) =>
    gasRequest({ action: 'auth/change-password', currentPassword, newPassword }),

  adminDeleteLog: (logId) =>
    gasRequest({ action: 'admin/log/delete', logId }),

  attendanceDelete: (logId) =>
    gasRequest({ action: 'attendance/delete', logId }),

};
