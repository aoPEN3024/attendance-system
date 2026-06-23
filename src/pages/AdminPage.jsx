import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const toYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
};

const formatDateJp = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['日','月','火','水','木','金','土'];
  return `${d.getMonth()+1}/${d.getDate()}（${days[d.getDay()]}）`;
};

// 日数⇔分の変換（1日=7.5h=450分）
const MIN_PER_DAY = 450;
const daysToMin = (d) => Math.round(Number(d) * MIN_PER_DAY) || 0;
const minToDays = (m) => Number(m) ? (Number(m) / MIN_PER_DAY) : '';
const DAY_OPTIONS = [
  { value: '',     label: '日数' },
  { value: '0.25', label: '0.25日' },
  { value: '0.5',  label: '0.5日' },
  { value: '0.75', label: '0.75日' },
  { value: '1',    label: '1.0日' },
];

const statusBadge = (status) => {
  const map = {
    confirmed:          { label: '確定',      bg: '#E6F7EE', color: '#1A7A4A' },
    pending:            { label: '申請中',    bg: '#FCEBEB', color: '#A32D2D' },
    leave:              { label: '有給',      bg: '#E6F1FB', color: '#1855A0' },
    leave_pending:      { label: '有給申請中', bg: '#FFF4E5', color: '#A05A00' },
    rejected:           { label: '差戻し',    bg: '#FCEBEB', color: '#A32D2D' },
    substitute_work:    { label: '振替出勤',  bg: '#FFF4E5', color: '#A05A00' },
    substitute_holiday: { label: '振替休日',  bg: '#E6F1FB', color: '#1855A0' },
  };
  const sv = map[status] || { label: status, bg: '#f5f5f5', color: '#888' };
  return <span style={{ fontSize: 10, borderRadius: 3, padding: '1px 5px', background: sv.bg, color: sv.color }}>{sv.label}</span>;
};

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [yearMonth, setYearMonth]       = useState(toYearMonth());
  const [employees, setEmployees]       = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading]           = useState(false);
  const [view, setView]                 = useState('list');
  const [mainTab, setMainTab]           = useState('attendance');
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [empData, setEmpData]           = useState(null);
  const [editRow, setEditRow]           = useState(null);
  const [editFields, setEditFields]     = useState({});
  const [editSites, setEditSites] = useState([{siteId:'',minutes:''},{siteId:'',minutes:''},{siteId:'',minutes:''}]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [editBreaks, setEditBreaks]     = useState({ am: false, noon: false, pm: false });
  const [memo, setMemo]                 = useState('');
  const [message, setMessage]           = useState('');

  // 社員管理用
  const [staffList, setStaffList]         = useState([]);
  const [staffView, setStaffView]         = useState('list');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffFields, setStaffFields]     = useState({});
  const [staffMessage, setStaffMessage]   = useState('');
  const [leaveGrant, setLeaveGrant]       = useState('');

  // 現場管理用
  const [siteList, setSiteList]         = useState([]);
  const [siteView, setSiteView]         = useState('list');
  const [selectedSite, setSelectedSite] = useState(null);
  const [siteFields, setSiteFields]     = useState({});
  const [siteMessage, setSiteMessage]   = useState('');
  const [siteSearch, setSiteSearch] = useState('');

  useEffect(() => { loadEmployees(); }, [yearMonth]);
  useEffect(() => { if (mainTab === 'staff') loadStaff(); }, [mainTab]);
  useEffect(() => { if (mainTab === 'sites') loadSites(); }, [mainTab]);
  useEffect(() => {
    api.sites().then(setSiteOptions).catch(() => {});
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const result = await api.adminEmployeesMonthly(yearMonth);
      setEmployees(result.employees);
      setTotalPending(result.totalPending);
    } catch (err) {
      console.log('社員一覧取得エラー:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const result = await api.adminEmployeesList();
      setStaffList(result);
    } catch (err) {
      console.log('社員マスタ取得エラー:', err.message);
    }
  };

  const loadSites = async () => {
    try {
      const result = await api.adminSitesList();
      setSiteList(result);
    } catch (err) {
      console.log('現場マスタ取得エラー:', err.message);
    }
  };

  const loadEmpDetail = async (emp) => {
    setSelectedEmp(emp);
    setView('detail');
    try {
      const result = await api.adminEmployeeMonthly(emp.employeeId, yearMonth);
      setEmpData(result);
    } catch (err) {
      console.log('社員詳細取得エラー:', err.message);
    }
  };

  const changeMonth = (delta) => {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditFields({ clockIn: row.clockIn || '', clockOut: row.clockOut || '' });
    setEditBreaks({ am: row.breaks?.am || false, noon: row.breaks?.noon || false, pm: row.breaks?.pm || false });
    setEditSites([
      { siteId: row.site1Id || '', days: minToDays(row.site1Min) },
      { siteId: row.site2Id || '', days: minToDays(row.site2Min) },
      { siteId: row.site3Id || '', days: minToDays(row.site3Min) },
    ]);
    setMemo('');
    setMessage('');
    setView('edit');
  };

  const handleAdminEdit = async () => {
    setMessage('');
    try {
      await api.adminEdit(selectedEmp.employeeId, editRow.date, {
        clockIn:   editFields.clockIn,
        clockOut:  editFields.clockOut,
        site1Id:   editSites[0]?.siteId || '',
        site1Min:  daysToMin(editSites[0]?.days),
        site2Id:   editSites[1]?.siteId || '',
        site2Min:  daysToMin(editSites[1]?.days),
        site3Id:   editSites[2]?.siteId || '',
        site3Min:  daysToMin(editSites[2]?.days),
        breakAm:   editBreaks.am   ? 'true' : 'false',
        breakNoon: editBreaks.noon ? 'true' : 'false',
        breakPm:   editBreaks.pm   ? 'true' : 'false',
        memo,
      });
      setMessage('保存しました');
      await loadEmpDetail(selectedEmp);
      setTimeout(() => { setView('detail'); setMessage(''); }, 1200);
    } catch (err) {
      setMessage('エラー: ' + err.message);
    }
  };

  const handleApprove = async (logId, result) => {
    try {
      await api.adminApprove(logId, result, '');
      await loadEmpDetail(selectedEmp);
      await loadEmployees();
    } catch (err) {
      console.log('承認エラー:', err.message);
    }
  };

  const renderApplyDetail = (row) => {
    if (row.status === 'leave_pending') {
      return <div style={{ fontSize: 12, color: '#1855A0', background: '#E6F1FB', borderRadius: 6, padding: '6px 10px', marginBottom: 6 }}>有給申請</div>;
    }
    const match = row.reason && row.reason.match(/\[申請内容:(.*)\]/);
    if (!match) return null;
    try {
      const a = JSON.parse(match[1]);
      return (
        <div style={{ fontSize: 12, color: '#666', background: '#f5f5f5', borderRadius: 6, padding: '6px 10px', marginBottom: 6 }}>
          <span style={{ color: '#888' }}>申請内容：</span>
          {a.clockIn}〜{a.clockOut}　
          休憩：{[a.breakAm==='true'&&'AM', a.breakNoon==='true'&&'昼', a.breakPm==='true'&&'PM'].filter(Boolean).join('+')||'なし'}　
          実働：{Math.floor(a.workMinutes/60)}h{a.workMinutes%60>0?a.workMinutes%60+'m':''}
        </div>
      );
    } catch(e) { return null; }
  };

  const sortedSites = [
    ...siteList.filter(s => s.active),
    ...siteList.filter(s => !s.active),
  ].filter(s =>
    s.siteName.includes(siteSearch) || s.siteId.includes(siteSearch)
  );

  // ── 打刻編集画面 ──────────────────────────────────────
  if (view === 'edit' && editRow) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <button onClick={() => setView('detail')} style={s.backBtn}>‹ 戻る</button>
          <div style={s.topTitle}>{selectedEmp?.name} — {formatDateJp(editRow.date)}</div>
          <span style={s.adminBadge}>管理者</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: '#A05A00', background: '#FFF4E5', borderRadius: 7, padding: '7px 10px', marginBottom: 12 }}>
            管理者による直接編集（申請不要・即時反映）
          </div>
          <div style={s.flabel}>現場・滞在時間</div>
          {editSites.map((site, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 6, marginBottom: 6 }}>
              <div style={{ border: '0.5px solid #ddd', borderRadius: 8, padding: '8px 10px', background: 'white', display: 'flex', alignItems: 'center' }}>
                <select
                  value={site.siteId}
                  onChange={e => setEditSites(prev => prev.map((s, i) => i === index ? { ...s, siteId: e.target.value } : s))}
                  style={{ flex: 1, border: 'none', background: 'none', fontSize: 13, color: '#222', outline: 'none' }}
                >
                  <option value="">現場{index + 1}</option>
                  {siteOptions.map(s => <option key={s.siteId} value={s.siteId}>{s.siteName}</option>)}
                </select>
              </div>
              <div style={{ border: '0.5px solid #ddd', borderRadius: 8, padding: '8px 6px', background: 'white' }}>
                <select
                  value={site.days}
                  onChange={e => setEditSites(prev => prev.map((s, i) => i === index ? { ...s, days: e.target.value } : s))}
                  style={{ width: '100%', border: 'none', background: 'none', fontSize: 13, color: '#222', outline: 'none', textAlign: 'center' }}
                >
                  {DAY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#888', textAlign: 'right', marginBottom: 12 }}>
            合計: <strong>{editSites.reduce((sum, s) => sum + (Number(s.days) || 0), 0)}日</strong>
          </div>
          <div style={s.flabel}>出勤・退勤時刻</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <input type="time" value={editFields.clockIn} onChange={e => setEditFields(f => ({...f, clockIn: e.target.value}))} style={s.timeInput} />
            <input type="time" value={editFields.clockOut} onChange={e => setEditFields(f => ({...f, clockOut: e.target.value}))} style={s.timeInput} />
          </div>
          <div style={s.flabel}>取得できた休憩</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
            {[{k:'am',l:'AM休憩',m:'15分'},{k:'noon',l:'昼休憩',m:'60分'},{k:'pm',l:'PM休憩',m:'15分'}].map(({k,l,m}) => (
              <button key={k} onClick={() => setEditBreaks(b => ({...b, [k]: !b[k]}))} style={{ ...s.breakBtn, background: editBreaks[k] ? '#E6F1FB' : 'white', borderColor: editBreaks[k] ? '#1855A0' : '#ddd' }}>
                <span style={{ fontSize: 12, fontWeight: 500, display: 'block', color: editBreaks[k] ? '#1855A0' : '#888' }}>{l}</span>
                <span style={{ fontSize: 10, color: editBreaks[k] ? '#1855A0' : '#aaa' }}>{m}</span>
              </button>
            ))}
          </div>
          <div style={s.flabel}>編集メモ（社内記録用）</div>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="例：本人からの申告により修正" style={s.textarea} rows={2} />
          {message && <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: message.startsWith('エラー') ? '#FCEBEB' : '#E6F7EE', color: message.startsWith('エラー') ? '#A32D2D' : '#1A7A4A' }}>{message}</div>}
          <button onClick={handleAdminEdit} style={s.saveBtn}>保存する</button>
          <button onClick={() => setView('detail')} style={s.cancelBtn}>キャンセル</button>
        </div>
      </div>
    </div>
  );

  // ── 社員詳細画面 ──────────────────────────────────────
  if (view === 'detail') return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <button onClick={() => { setView('list'); setEmpData(null); }} style={s.backBtn}>‹ 戻る</button>
          <div style={s.topTitle}>{selectedEmp?.name} — {yearMonth.replace('-','年')}月</div>
          <span style={s.adminBadge}>管理者</span>
        </div>
        {empData && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, padding: '10px 14px', borderBottom: '0.5px solid #eee' }}>
            {[
              { label: '総労働', value: empData.summary.totalHours + 'h' },
              { label: '時間外', value: empData.summary.overtimeHours + 'h', warn: empData.summary.overtimeHours > 0 },
              { label: '有給残', value: empData.leaveBalance + '日' },
            ].map(({ label, value, warn }) => (
              <div key={label} style={{ background: '#f9f9f9', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: warn ? '#A05A00' : '#222' }}>{value}</div>
              </div>
            ))}
          </div>
        )}
        {empData && empData.rows.some(r => r.status === 'pending' || r.status === 'leave_pending') && (
          <div style={{ padding: '8px 14px', borderBottom: '0.5px solid #eee', background: '#fffaf5' }}>
            <button
              onClick={async () => {
                if (!window.confirm('全ての申請を一括承認しますか？')) return;
                try {
                  const result = await api.adminApproveAll(selectedEmp.employeeId, yearMonth);
                  alert(result.message);
                  const getDetailDays = (yearMonth) => {
                    const [y, m] = yearMonth.split('-').map(Number);
                    const count = new Date(y, m, 0).getDate();
                    const days = [];
                    for (let i = 1; i <= count; i++) {
                      days.push(`${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`);
                    }
                    return days;
                  };
                  await loadEmpDetail(selectedEmp);
                  await loadEmployees();
                } catch(err) { alert('エラー：' + err.message); }
              }}
              style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 500, background: '#E6F7EE', color: '#1A7A4A', border: '0.5px solid #7DC4A0', borderRadius: 8, cursor: 'pointer' }}
            >
              この月の申請を全て承認する
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', borderBottom: '0.5px solid #eee' }}>
          <button onClick={() => changeMonth(-1)} style={s.monthBtn}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500 }}>{yearMonth.replace('-','年')}月</div>
          <button onClick={() => changeMonth(1)} style={s.monthBtn}>›</button>
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: 820 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 42px 42px 60px 52px 36px 120px 140px 140px 140px', gap: 3, padding: '5px 14px', background: '#f5f5f5', borderBottom: '0.5px solid #eee' }}>
              <span style={{ fontSize: 10, color: '#aaa', position: 'sticky', left: 14, background: '#f5f5f5', zIndex: 1 }}>日付</span>
              {['出勤','退勤','実働','区分','操作','休憩','現場1','現場2','現場3'].map(h => <span key={h} style={{ fontSize: 10, color: '#aaa' }}>{h}</span>)}
            </div>
        {!empData && <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>読み込み中...</div>}
        {empData && (() => {
          const rowMap = {};
          empData.rows.forEach(r => { 
            if (!rowMap[r.date]) rowMap[r.date] = r;
          });
          const [y, m] = yearMonth.split('-').map(Number);
          const count = new Date(y, m, 0).getDate();
          const DOW = ['日','月','火','水','木','金','土'];
          const days = [];
          for (let i = 1; i <= count; i++) {
            days.push(`${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`);
          }
          return days.map(date => {
            const row = rowMap[date];
            const d = new Date(date + 'T00:00:00');
            const dow = d.getDay();
            const dateColor = dow === 0 ? '#E24B4A' : dow === 6 ? '#1855A0' : '#666';
            const dateLabel = `${date.slice(5,7).replace(/^0/,'')}/${date.slice(8,10).replace(/^0/,'')}（${DOW[dow]}）`;
            if (!row) return (
              <div key={date} onClick={() => openEdit({ date, clockIn:'', clockOut:'', breaks:{}, site1Id:'', site1Min:0, site2Id:'', site2Min:0, site3Id:'', site3Min:0, status:'', reason:'', logId: date })} style={{ display: 'grid', gridTemplateColumns: '50px 42px 42px 60px 52px 36px 120px 140px 140px 140px', gap: 3, padding: '9px 14px', borderBottom: '0.5px solid #eee', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 12, color: dateColor, position: 'sticky', left: 14, background: 'white', zIndex: 1 }}>{dateLabel}</div>
                <div style={{ fontSize: 12, color: '#ddd', textAlign: 'right' }}>--</div>
                <div style={{ fontSize: 12, color: '#ddd', textAlign: 'right' }}>--</div>
                <div style={{ fontSize: 12, color: '#ddd', textAlign: 'right' }}>--</div>
                <div></div>
                <div></div>
                <div style={{ fontSize: 11, color: '#ddd' }}>--</div>
                <div style={{ fontSize: 11, color: '#ddd' }}>--</div>
                <div style={{ fontSize: 11, color: '#ddd' }}>--</div>
                <div style={{ fontSize: 11, color: '#ddd' }}>--</div>
              </div>
            );
            // 休憩表示
            const breakParts = [
              row.breaks?.am   && 'AM',
              row.breaks?.noon && '昼',
              row.breaks?.pm   && 'PM',
            ].filter(Boolean);
            const breakMin = (row.breaks?.am ? 15 : 0) + (row.breaks?.noon ? 60 : 0) + (row.breaks?.pm ? 15 : 0);
            const breakLabel = breakParts.length ? `${breakParts.join('+')} ${breakMin}分` : '--';

            // 現場名表示
            const siteName = (siteId) => siteOptions.find(s => s.siteId === siteId)?.siteName || '';
            const siteDisplay = (id, min) => {
              if (!id) return '--';
              const name = siteName(id);
              const days = min ? (min / 450) : 0;
              return `${name} ${days}日`;
            };

            return (
              <div key={row.logId}>
                <div style={{ display: 'grid', gridTemplateColumns: '50px 42px 42px 60px 52px 36px 120px 140px 140px 140px', gap: 3, padding: '9px 14px', borderBottom: row.status === 'pending' || row.status === 'leave_pending' ? 'none' : '0.5px solid #eee', alignItems: 'center' }}>
                  <div onClick={() => openEdit(row)} style={{ fontSize: 12, color: dateColor, cursor: 'pointer', position: 'sticky', left: 14, background: 'white', zIndex: 1 }}>{dateLabel}</div>
                  <div onClick={() => openEdit(row)} style={{ fontSize: 12, color: row.clockIn ? '#222' : '#ccc', textAlign: 'right', cursor: 'pointer' }}>{row.clockIn || '--'}</div>
                  <div onClick={() => openEdit(row)} style={{ fontSize: 12, color: row.clockOut ? '#222' : '#ccc', textAlign: 'right', cursor: 'pointer' }}>{row.clockOut ? (row.clockIn && row.clockOut < row.clockIn ? `翌${row.clockOut}` : row.clockOut) : '--'}</div>
                  <div onClick={() => openEdit(row)} style={{ fontSize: 12, fontWeight: 500, textAlign: 'right', cursor: 'pointer' }}>{row.workDisplay || '--'}</div>
                  <div onClick={() => openEdit(row)} style={{ cursor: 'pointer' }}>{statusBadge(row.status)}</div>
                  <div>
                    {(row.status === 'confirmed' || row.status === 'leave' || row.status === 'rejected') && (
                      <button onClick={async () => {
                        const isRejected = row.status === 'rejected';
                        if (!window.confirm(isRejected ? 'この打刻を削除しますか？' : 'この打刻を取り消しますか？')) return;
                        try {
                          if (isRejected) {
                            await api.adminDeleteLog(row.logId);
                          } else {
                            await api.adminApprove(row.logId, 'rejected', '');
                          }
                          await loadEmpDetail(selectedEmp);
                          await loadEmployees();
                        } catch(err) { alert('エラー：' + err.message); }
                      }} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '0.5px solid #F09595', background: 'white', color: '#A32D2D', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {row.status === 'rejected' ? '削除' : '取消'}
                      </button>
                    )}
                  </div>
                  <div onClick={() => openEdit(row)} style={{ fontSize: 11, color: '#666', cursor: 'pointer' }}>{breakLabel}</div>
                  <div onClick={() => openEdit(row)} style={{ fontSize: 11, color: row.site1Id ? '#666' : '#ddd', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siteDisplay(row.site1Id, row.site1Min)}</div>
                  <div onClick={() => openEdit(row)} style={{ fontSize: 11, color: row.site2Id ? '#666' : '#ddd', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siteDisplay(row.site2Id, row.site2Min)}</div>
                  <div onClick={() => openEdit(row)} style={{ fontSize: 11, color: row.site3Id ? '#666' : '#ddd', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siteDisplay(row.site3Id, row.site3Min)}</div>
                </div>
                {(row.status === 'pending' || row.status === 'leave_pending') && (
                  <div style={{ padding: '6px 14px 10px', borderBottom: '0.5px solid #eee', background: '#fffaf5' }}>
                    {renderApplyDetail(row)}
                    {row.reason && <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{row.reason.replace(/\s*\[申請内容:.*\]/, '').trim()}</div>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleApprove(row.logId, 'approved')} style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 500, background: '#E6F7EE', color: '#1A7A4A', border: '0.5px solid #7DC4A0', borderRadius: 6, cursor: 'pointer' }}>承認</button>
                      <button onClick={() => handleApprove(row.logId, 'rejected')} style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 500, background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F09595', borderRadius: 6, cursor: 'pointer' }}>差戻し</button>
                    </div>
                  </div>
                )}
              </div>
            );
          });
        })()}
        </div>
        </div>
        <div style={{ height: 20 }} />
      </div>
    </div>
  );

  // ── 社員管理サブ画面 ──────────────────────────────────
  if (mainTab === 'staff') {

    // 社員追加・編集フォーム
    if (staffView === 'add' || staffView === 'edit') {
      const isAdd = staffView === 'add';
      return (
        <div style={s.page}>
          <div style={s.card}>
            <div style={s.topbar}>
              <button onClick={() => { setStaffView('list'); setStaffMessage(''); }} style={s.backBtn}>‹ 戻る</button>
              <div style={s.topTitle}>{isAdd ? '社員追加' : '社員編集'}</div>
              <span style={s.adminBadge}>管理者</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {isAdd && (
                <>
                  <div style={s.flabel}>社員ID（変更不可）</div>
                  <input value={staffFields.employeeId || ''} onChange={e => setStaffFields(f => ({...f, employeeId: e.target.value}))} placeholder="例: EMP004" style={{ ...s.timeInput, marginBottom: 12 }} />
                </>
              )}
              <div style={s.flabel}>氏名</div>
              <input value={staffFields.name || ''} onChange={e => setStaffFields(f => ({...f, name: e.target.value}))} placeholder="例: 山田 太郎" style={{ ...s.timeInput, marginBottom: 12 }} />
              <div style={s.flabel}>権限</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[{v:'general',l:'一般'},{v:'admin',l:'管理者'}].map(({v,l}) => (
                  <button key={v} onClick={() => setStaffFields(f => ({...f, role: v}))}
                    style={{ padding: '9px 0', fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: 'pointer', border: '0.5px solid', background: staffFields.role === v ? '#E6F1FB' : 'white', borderColor: staffFields.role === v ? '#1855A0' : '#ddd', color: staffFields.role === v ? '#1855A0' : '#888' }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={s.flabel}>入社日</div>
              <input type="date" value={staffFields.hireDate || ''} onChange={e => setStaffFields(f => ({...f, hireDate: e.target.value}))} style={{ ...s.timeInput, marginBottom: 12 }} />
              {isAdd && (
                <>
                  <div style={s.flabel}>初期パスワード</div>
                  <input type="password" value={staffFields.password || ''} onChange={e => setStaffFields(f => ({...f, password: e.target.value}))} placeholder="初期パスワードを入力" style={{ ...s.timeInput, marginBottom: 12 }} />
                </>
              )}
              {staffMessage && <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: staffMessage.startsWith('エラー') ? '#FCEBEB' : '#E6F7EE', color: staffMessage.startsWith('エラー') ? '#A32D2D' : '#1A7A4A' }}>{staffMessage}</div>}
              <button onClick={async () => {
                setStaffMessage('');
                try {
                  if (isAdd) {
                    await api.adminEmployeeAdd(staffFields.employeeId, staffFields.name, staffFields.password, staffFields.role || 'general', staffFields.hireDate);
                  } else {
                    await api.adminEmployeeEdit(selectedStaff.employeeId, staffFields.name, staffFields.role, staffFields.hireDate);
                  }
                  setStaffMessage(isAdd ? '追加しました' : '更新しました');
                  await loadStaff();
                  setTimeout(() => { setStaffView('list'); setStaffMessage(''); }, 1200);
                } catch(err) { setStaffMessage('エラー: ' + err.message); }
              }} style={s.saveBtn}>保存する</button>
              <button onClick={() => { setStaffView('list'); setStaffMessage(''); }} style={s.cancelBtn}>キャンセル</button>
            </div>
          </div>
        </div>
      );
    }

    // パスワード変更
    if (staffView === 'password') return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.topbar}>
            <button onClick={() => { setStaffView('list'); setStaffMessage(''); }} style={s.backBtn}>‹ 戻る</button>
            <div style={s.topTitle}>{selectedStaff?.name} — PW変更</div>
            <span style={s.adminBadge}>管理者</span>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <div style={s.flabel}>新しいパスワード</div>
            <input type="password" value={staffFields.newPassword || ''} onChange={e => setStaffFields(f => ({...f, newPassword: e.target.value}))} placeholder="新しいパスワードを入力" style={{ ...s.timeInput, marginBottom: 12 }} />
            {staffMessage && <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: staffMessage.startsWith('エラー') ? '#FCEBEB' : '#E6F7EE', color: staffMessage.startsWith('エラー') ? '#A32D2D' : '#1A7A4A' }}>{staffMessage}</div>}
            <button onClick={async () => {
              setStaffMessage('');
              try {
                await api.adminEmployeePassword(selectedStaff.employeeId, staffFields.newPassword);
                setStaffMessage('パスワードを変更しました');
                setTimeout(() => { setStaffView('list'); setStaffMessage(''); }, 1200);
              } catch(err) { setStaffMessage('エラー: ' + err.message); }
            }} style={s.saveBtn}>変更する</button>
            <button onClick={() => { setStaffView('list'); setStaffMessage(''); }} style={s.cancelBtn}>キャンセル</button>
          </div>
        </div>
      </div>
    );

    // 有給付与
    // 有給付与
    if (staffView === 'leave') return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.topbar}>
            <button onClick={() => { setStaffView('list'); setStaffMessage(''); }} style={s.backBtn}>‹ 戻る</button>
            <div style={s.topTitle}>有給管理</div>
            <span style={s.adminBadge}>管理者</span>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {selectedStaff ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#222', marginBottom: 4 }}>{selectedStaff.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>現在の有給残日数：{selectedStaff.leaveBalance}日</div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>全員に一括付与</div>
            )}
            <div style={s.flabel}>種別</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[{v:'付与',l:'付与'},{v:'減算',l:'減算（修正）'}].map(({v,l}) => (
                <button key={v} onClick={() => setStaffFields(f => ({...f, leaveType: v}))}
                  style={{ padding: '9px 0', fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: 'pointer', border: '0.5px solid', background: (staffFields.leaveType || '付与') === v ? '#E6F1FB' : 'white', borderColor: (staffFields.leaveType || '付与') === v ? '#1855A0' : '#ddd', color: (staffFields.leaveType || '付与') === v ? '#1855A0' : '#888' }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={s.flabel}>日数</div>
            <input type="number" value={leaveGrant} onChange={e => setLeaveGrant(e.target.value)} placeholder="例: 10" min="1" style={{ ...s.timeInput, marginBottom: 12 }} />
            {staffMessage && <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: staffMessage.startsWith('エラー') ? '#FCEBEB' : '#E6F7EE', color: staffMessage.startsWith('エラー') ? '#A32D2D' : '#1A7A4A' }}>{staffMessage}</div>}
            <button onClick={async () => {
              setStaffMessage('');
              try {
                const isDeduct = (staffFields.leaveType || '付与') === '減算';
                await api.leaveGrant(
                  selectedStaff?.employeeId || '',
                  isDeduct ? -Number(leaveGrant) : Number(leaveGrant),
                  isDeduct ? '手動減算' : '手動付与',
                  !selectedStaff
                );
                setStaffMessage(isDeduct ? '減算しました' : '付与しました');
                await loadStaff();
                setTimeout(() => { setStaffView('list'); setStaffMessage(''); }, 1200);
              } catch(err) { setStaffMessage('エラー: ' + err.message); }
            }} style={s.saveBtn}>
              {(staffFields.leaveType || '付与') === '減算' ? '減算する' : '付与する'}
            </button>
            <button onClick={() => { setStaffView('list'); setStaffMessage(''); }} style={s.cancelBtn}>キャンセル</button>
          </div>
        </div>
      </div>
    );

    // 社員管理一覧
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.topbar}>
            <div style={s.topTitle}>社員管理</div>
            <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>{user?.name}</span>
            <button onClick={logout} style={{ border: 'none', background: 'none', fontSize: 13, color: '#888', cursor: 'pointer' }}>ログアウト</button>
          </div>

          {/* タブ */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid #eee' }}>
            {[{k:'attendance',l:'勤怠'},{k:'staff',l:'社員'},{k:'sites',l:'現場'}].map(({k,l}) => (
              <button key={k} onClick={() => setMainTab(k)} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: mainTab === k ? 500 : 400, border: 'none', background: 'none', borderBottom: mainTab === k ? '2px solid #1855A0' : '2px solid transparent', color: mainTab === k ? '#1855A0' : '#888', cursor: 'pointer' }}>{l}</button>
            ))}
          </div>

          <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #eee' }}>
            <div style={{ fontSize: 12, color: '#888' }}>{staffList.length}名登録中</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setSelectedStaff(null); setLeaveGrant(''); setStaffMessage(''); setStaffView('leave'); }}
                style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #7DC4A0', background: '#E6F7EE', color: '#1A7A4A', cursor: 'pointer' }}>
                一括有給付与
              </button>
              <button onClick={() => { setStaffFields({ role: 'general' }); setStaffMessage(''); setStaffView('add'); }}
                style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #B5D4F4', background: '#E6F1FB', color: '#1855A0', cursor: 'pointer' }}>
                ＋ 社員追加
              </button>
            </div>
          </div>

          {staffList.map(staff => (
            <div key={staff.employeeId} style={{ padding: '11px 14px', borderBottom: '0.5px solid #eee', opacity: staff.active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: staff.active ? '#E6F1FB' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: staff.active ? '#1855A0' : '#aaa', flexShrink: 0 }}>
                  {staff.name.slice(0,2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{staff.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {staff.employeeId}　{staff.role === 'admin' ? '管理者' : '一般'}　有給残{staff.leaveBalance}日
                    {!staff.active && <span style={{ color: '#A32D2D', marginLeft: 6 }}>無効</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 5 }}>
                <button onClick={() => { setSelectedStaff(staff); setStaffFields({ name: staff.name, role: staff.role, hireDate: staff.hireDate }); setStaffMessage(''); setStaffView('edit'); }}
                  style={{ fontSize: 11, padding: '6px 0', borderRadius: 6, border: '0.5px solid #ddd', background: 'white', color: '#444', cursor: 'pointer' }}>編集</button>
                <button onClick={() => { setSelectedStaff(staff); setStaffFields({}); setStaffMessage(''); setStaffView('password'); }}
                  style={{ fontSize: 11, padding: '6px 0', borderRadius: 6, border: '0.5px solid #ddd', background: 'white', color: '#444', cursor: 'pointer' }}>PW変更</button>
                <button onClick={() => { setSelectedStaff(staff); setLeaveGrant(''); setStaffMessage(''); setStaffView('leave'); }}
                  style={{ fontSize: 11, padding: '6px 0', borderRadius: 6, border: '0.5px solid #7DC4A0', background: '#E6F7EE', color: '#1A7A4A', cursor: 'pointer' }}>有給付与</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                <button onClick={async () => {
                  try {
                    const result = await api.payslipUpload(staff.employeeId);
                    window.open(result.folderUrl, '_blank');
                  } catch(err) { alert('エラー: ' + err.message); }
                }} style={{ fontSize: 11, padding: '6px 0', borderRadius: 6, border: '0.5px solid #B5D4F4', background: '#E6F1FB', color: '#1855A0', cursor: 'pointer' }}>
                  給与明細UP
                </button>
                <button onClick={async () => {
                  if (!window.confirm(`${staff.name}を${staff.active ? '無効' : '有効'}にしますか？`)) return;
                  try {
                    await api.adminEmployeeToggle(staff.employeeId);
                    await loadStaff();
                  } catch(err) { alert('エラー: ' + err.message); }
                }} style={{ fontSize: 11, padding: '6px 0', borderRadius: 6, border: `0.5px solid ${staff.active ? '#F09595' : '#7DC4A0'}`, background: staff.active ? '#FCEBEB' : '#E6F7EE', color: staff.active ? '#A32D2D' : '#1A7A4A', cursor: 'pointer' }}>
                  {staff.active ? '無効化' : '有効化'}
                </button>
              </div>
            </div>
          ))}
          <div style={{ height: 20 }} />
        </div>
      </div>
    );
  }

  // ── 現場管理サブ画面 ──────────────────────────────────
  
  if (mainTab === 'sites') {

    // 現場追加・編集フォーム
    if (siteView === 'add' || siteView === 'edit') {
      const isAdd = siteView === 'add';
      return (
        <div style={s.page}>
          <div style={s.card}>
            <div style={s.topbar}>
              <button onClick={() => { setSiteView('list'); setSiteMessage(''); }} style={s.backBtn}>‹ 戻る</button>
              <div style={s.topTitle}>{isAdd ? '現場追加' : '現場編集'}</div>
              <span style={s.adminBadge}>管理者</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {isAdd && (
                <>
                  <div style={s.flabel}>現場ID（変更不可）</div>
                  <input value={siteFields.siteId || ''} onChange={e => setSiteFields(f => ({...f, siteId: e.target.value}))} placeholder="例: SITE004" style={{ ...s.timeInput, marginBottom: 12 }} />
                </>
              )}
              <div style={s.flabel}>現場名</div>
              <input value={siteFields.siteName || ''} onChange={e => setSiteFields(f => ({...f, siteName: e.target.value}))} placeholder="例: 〇〇建設 C現場" style={{ ...s.timeInput, marginBottom: 12 }} />
              {siteMessage && <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: siteMessage.startsWith('エラー') ? '#FCEBEB' : '#E6F7EE', color: siteMessage.startsWith('エラー') ? '#A32D2D' : '#1A7A4A' }}>{siteMessage}</div>}
              <button onClick={async () => {
                setSiteMessage('');
                try {
                  if (isAdd) {
                    await api.adminSiteAdd(siteFields.siteId, siteFields.siteName);
                  } else {
                    await api.adminSiteEdit(selectedSite.siteId, siteFields.siteName);
                  }
                  setSiteMessage(isAdd ? '追加しました' : '更新しました');
                  await loadSites();
                  setTimeout(() => { setSiteView('list'); setSiteMessage(''); }, 1200);
                } catch(err) { setSiteMessage('エラー: ' + err.message); }
              }} style={s.saveBtn}>保存する</button>
              <button onClick={() => { setSiteView('list'); setSiteMessage(''); }} style={s.cancelBtn}>キャンセル</button>
            </div>
          </div>
        </div>
      );
    }

    // 現場管理一覧
    
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.topbar}>
            <div style={s.topTitle}>現場管理</div>
            <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>{user?.name}</span>
            <button onClick={logout} style={{ border: 'none', background: 'none', fontSize: 13, color: '#888', cursor: 'pointer' }}>ログアウト</button>
          </div>

          {/* タブ */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid #eee' }}>
            {[{k:'attendance',l:'勤怠'},{k:'staff',l:'社員'},{k:'sites',l:'現場'}].map(({k,l}) => (
              <button key={k} onClick={() => setMainTab(k)} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: mainTab === k ? 500 : 400, border: 'none', background: 'none', borderBottom: mainTab === k ? '2px solid #1855A0' : '2px solid transparent', color: mainTab === k ? '#1855A0' : '#888', cursor: 'pointer' }}>{l}</button>
            ))}
          </div>

          <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #eee' }}>
            <div style={{ fontSize: 12, color: '#888' }}>{siteList.length}件登録中</div>
            <button onClick={() => { setSiteFields({}); setSiteMessage(''); setSiteView('add'); }}
              style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #B5D4F4', background: '#E6F1FB', color: '#1855A0', cursor: 'pointer' }}>
              ＋ 現場追加
            </button>
          </div>
          <div style={{ padding: '8px 14px', borderBottom: '0.5px solid #eee' }}>
            <input
              value={siteSearch}
              onChange={e => setSiteSearch(e.target.value)}
              placeholder="現場名・IDで検索..."
              style={{ width: '100%', border: '0.5px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {sortedSites.map(site => (
            <div key={site.siteId} style={{ padding: '11px 14px', borderBottom: '0.5px solid #eee', opacity: site.active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: site.active ? '#E6F1FB' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: site.active ? '#1855A0' : '#aaa', flexShrink: 0 }}>
                  現場
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{site.siteName}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {site.siteId}
                    {!site.active && <span style={{ color: '#A32D2D', marginLeft: 6 }}>無効</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: site.active ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                <button onClick={() => { setSelectedSite(site); setSiteFields({ siteName: site.siteName }); setSiteMessage(''); setSiteView('edit'); }}
                  style={{ fontSize: 11, padding: '6px 0', borderRadius: 6, border: '0.5px solid #ddd', background: 'white', color: '#444', cursor: 'pointer' }}>編集</button>
                <button onClick={async () => {
                  if (!window.confirm(`${site.siteName}を${site.active ? '無効' : '有効'}にしますか？`)) return;
                  try {
                    await api.adminSiteToggle(site.siteId);
                    await loadSites();
                  } catch(err) { alert('エラー: ' + err.message); }
                }} style={{ fontSize: 11, padding: '6px 0', borderRadius: 6, border: `0.5px solid ${site.active ? '#F09595' : '#7DC4A0'}`, background: site.active ? '#FCEBEB' : '#E6F7EE', color: site.active ? '#A32D2D' : '#1A7A4A', cursor: 'pointer' }}>
                  {site.active ? '無効化' : '有効化'}
                </button>
                {!site.active && (
                  <button onClick={async () => {
                    if (!window.confirm(`${site.siteName}を完全に削除しますか？\nこの操作は取り消せません。`)) return;
                    try {
                      await api.adminSiteDelete(site.siteId);
                      await loadSites();
                    } catch(err) { alert('エラー: ' + err.message); }
                  }} style={{ fontSize: 11, padding: '6px 0', borderRadius: 6, border: '0.5px solid #A32D2D', background: '#A32D2D', color: 'white', cursor: 'pointer' }}>
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
          <div style={{ height: 20 }} />
        </div>
      </div>
    );
  }

  // ── 勤怠管理一覧画面 ──────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <div style={s.topTitle}>管理者画面</div>
          <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>{user?.name}</span>
          <button onClick={logout} style={{ border: 'none', background: 'none', fontSize: 13, color: '#888', cursor: 'pointer' }}>ログアウト</button>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid #eee' }}>
          {[{k:'attendance',l:'勤怠'},{k:'staff',l:'社員'},{k:'sites',l:'現場'}].map(({k,l}) => (
            <button key={k} onClick={() => setMainTab(k)} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: mainTab === k ? 500 : 400, border: 'none', background: 'none', borderBottom: mainTab === k ? '2px solid #1855A0' : '2px solid transparent', color: mainTab === k ? '#1855A0' : '#888', cursor: 'pointer' }}>{l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '0.5px solid #eee' }}>
          <button onClick={() => changeMonth(-1)} style={s.monthBtn}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 500 }}>{yearMonth.replace('-','年')}月</div>
          <button onClick={() => changeMonth(1)} style={s.monthBtn}>›</button>
        </div>

        {totalPending > 0 && (
          <div style={{ margin: '10px 14px 0', padding: '8px 12px', background: '#FFF4E5', borderRadius: 8, fontSize: 13, color: '#A05A00' }}>
            未承認の申請が {totalPending} 件あります
          </div>
        )}

        {loading && <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>読み込み中...</div>}

        {employees.map(emp => (
          <div key={emp.employeeId} onClick={() => loadEmpDetail(emp)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '0.5px solid #eee', cursor: 'pointer' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: emp.pendingCount > 0 ? '#FFF4E5' : '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: emp.pendingCount > 0 ? '#A05A00' : '#1855A0', flexShrink: 0 }}>
              {emp.name.slice(0,2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{emp.name}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                {emp.pendingCount > 0 ? `申請 ${emp.pendingCount}件` : '申請なし'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{emp.totalHours}h</div>
              <div style={{ fontSize: 11, color: emp.overtimeHours > 0 ? '#A05A00' : '#888' }}>
                {emp.overtimeHours > 0 ? `残業 ${emp.overtimeHours}h` : '残業なし'}
              </div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 16, color: '#ccc' }} />
          </div>
        ))}

        <div style={{ margin: '12px 14px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>月次締め・CSV出力</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <button
              onClick={async () => {
                if (!window.confirm(`${yearMonth.replace('-','年')}月を締めますか？\n締め後は打刻の編集ができなくなります。`)) return;
                try {
                  const result = await api.adminClose(yearMonth);
                  alert(result.message + '\n支払日：' + result.payDate);
                } catch(err) { alert('エラー：' + err.message); }
              }}
              style={{ padding: '10px 0', fontSize: 12, fontWeight: 500, background: '#FFF4E5', color: '#A05A00', border: '0.5px solid #F0C97A', borderRadius: 8, cursor: 'pointer' }}
            >この月を締める</button>
            <button
              onClick={async () => {
                if (!window.confirm(`${yearMonth.replace('-','年')}月の締めを解除しますか？`)) return;
                try {
                  const result = await api.adminOpen(yearMonth);
                  alert(result.message);
                } catch(err) { alert('エラー：' + err.message); }
              }}
              style={{ padding: '10px 0', fontSize: 12, fontWeight: 500, background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F09595', borderRadius: 8, cursor: 'pointer' }}
            >締めを解除する</button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>CSV出力</div>
          <button
            onClick={() => api.adminExportCsv(yearMonth, 'summary')}
            style={{ width: '100%', padding: '10px 0', fontSize: 12, fontWeight: 500, background: '#E6F7EE', color: '#1A7A4A', border: '0.5px solid #7DC4A0', borderRadius: 8, cursor: 'pointer', marginBottom: 6 }}
          >全体集計CSV</button>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>個人別CSV</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {employees.map(emp => (
              <button
                key={emp.employeeId}
                onClick={() => api.adminExportCsv(yearMonth, 'individual', emp.employeeId)}
                style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 500, background: '#E6F1FB', color: '#1855A0', border: '0.5px solid #B5D4F4', borderRadius: 8, cursor: 'pointer' }}
              >{emp.name}</button>
            ))}
          </div>
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

const s = {
  page:       { minHeight: '100svh', background: '#f5f5f5', display: 'flex', justifyContent: 'center', padding: '1rem' },
  card:       { background: 'white', border: '0.5px solid #eee', borderRadius: 16, width: '100%', maxWidth: 400, alignSelf: 'flex-start', overflow: 'hidden' },
  topbar:     { background: '#f9f9f9', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid #eee' },
  topTitle:   { fontSize: 14, fontWeight: 500, color: '#222', flex: 1 },
  backBtn:    { border: 'none', background: 'none', fontSize: 18, color: '#888', cursor: 'pointer', padding: 0 },
  monthBtn:   { border: 'none', background: 'none', fontSize: 20, color: '#888', cursor: 'pointer', padding: '0 4px' },
  adminBadge: { fontSize: 11, background: '#FFF4E5', color: '#A05A00', borderRadius: 4, padding: '2px 7px', flexShrink: 0 },
  flabel:     { fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 4 },
  timeInput:  { border: '0.5px solid #ddd', borderRadius: 8, padding: '9px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' },
  breakBtn:   { border: '0.5px solid', borderRadius: 8, padding: '8px 4px', textAlign: 'center', cursor: 'pointer' },
  textarea:   { border: '0.5px solid #ddd', borderRadius: 8, padding: '9px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit', marginBottom: 12 },
  saveBtn:    { width: '100%', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 500, background: '#E6F7EE', color: '#1A7A4A', border: '1.5px solid #7DC4A0', cursor: 'pointer', marginBottom: 8 },
  cancelBtn:  { width: '100%', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 500, background: 'white', color: '#888', border: '0.5px solid #ddd', cursor: 'pointer' },
};