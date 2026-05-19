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

const statusBadge = (status) => {
  const map = {
    confirmed:     { label: '確定',      bg: '#E6F7EE', color: '#1A7A4A' },
    pending:       { label: '申請中',    bg: '#FCEBEB', color: '#A32D2D' },
    leave:         { label: '有給',      bg: '#E6F1FB', color: '#185FA5' },
    leave_pending: { label: '有給申請中', bg: '#FFF4E5', color: '#A05A00' },
    rejected:      { label: '差戻し',    bg: '#FCEBEB', color: '#A32D2D' },
    substitute_work:    { label: '振替出勤', bg: '#FFF4E5', color: '#A05A00' },
    substitute_holiday: { label: '振替休日', bg: '#E6F1FB', color: '#185FA5' },
  };
  const s = map[status] || { label: status, bg: '#f5f5f5', color: '#888' };
  return <span style={{ fontSize: 10, borderRadius: 3, padding: '1px 5px', background: s.bg, color: s.color }}>{s.label}</span>;
};

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [yearMonth, setYearMonth]       = useState(toYearMonth());
  const [employees, setEmployees]       = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading]           = useState(false);
  const [view, setView]                 = useState('list');
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [empData, setEmpData]           = useState(null);
  const [editRow, setEditRow]           = useState(null);
  const [editFields, setEditFields]     = useState({});
  const [editBreaks, setEditBreaks]     = useState({ am: false, noon: false, pm: false });
  const [memo, setMemo]                 = useState('');
  const [message, setMessage]           = useState('');

  useEffect(() => { loadEmployees(); }, [yearMonth]);

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
    setEditFields({ clockIn: row.clockIn || '', clockOut: row.clockOut || '', siteId: row.siteId || '' });
    setEditBreaks({ am: row.breaks?.am || false, noon: row.breaks?.noon || false, pm: row.breaks?.pm || false });
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
        siteId:    editFields.siteId,
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
      return (
        <div style={{ fontSize: 12, color: '#185FA5', background: '#E6F1FB', borderRadius: 6, padding: '6px 10px', marginBottom: 6 }}>
          有給申請
        </div>
      );
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

  // ── 編集画面 ──────────────────────────────────────────
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
          <div style={s.flabel}>出勤・退勤時刻</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <input type="time" value={editFields.clockIn} onChange={e => setEditFields(f => ({...f, clockIn: e.target.value}))} style={s.timeInput} />
            <input type="time" value={editFields.clockOut} onChange={e => setEditFields(f => ({...f, clockOut: e.target.value}))} style={s.timeInput} />
          </div>
          <div style={s.flabel}>取得できた休憩</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
            {[{k:'am',l:'AM休憩',m:'15分'},{k:'noon',l:'昼休憩',m:'60分'},{k:'pm',l:'PM休憩',m:'15分'}].map(({k,l,m}) => (
              <button key={k} onClick={() => setEditBreaks(b => ({...b, [k]: !b[k]}))} style={{ ...s.breakBtn, background: editBreaks[k] ? '#E6F1FB' : 'white', borderColor: editBreaks[k] ? '#185FA5' : '#ddd' }}>
                <span style={{ fontSize: 12, fontWeight: 500, display: 'block', color: editBreaks[k] ? '#185FA5' : '#888' }}>{l}</span>
                <span style={{ fontSize: 10, color: editBreaks[k] ? '#185FA5' : '#aaa' }}>{m}</span>
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

        <div style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', borderBottom: '0.5px solid #eee' }}>
          <button onClick={() => changeMonth(-1)} style={s.monthBtn}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500 }}>{yearMonth.replace('-','年')}月</div>
          <button onClick={() => changeMonth(1)} style={s.monthBtn}>›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '50px 42px 42px 1fr 52px', gap: 3, padding: '5px 14px', background: '#f5f5f5', borderBottom: '0.5px solid #eee' }}>
          {['日付','出勤','退勤','実働','区分'].map(h => <span key={h} style={{ fontSize: 10, color: '#aaa' }}>{h}</span>)}
        </div>

        {!empData && <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>読み込み中...</div>}

        {empData?.rows.map(row => (
          <div key={row.logId}>
            <div onClick={() => openEdit(row)} style={{ display: 'grid', gridTemplateColumns: '50px 42px 42px 1fr 52px', gap: 3, padding: '9px 14px', borderBottom: row.status === 'pending' || row.status === 'leave_pending' ? 'none' : '0.5px solid #eee', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 12, color: '#666' }}>{formatDateJp(row.date)}</div>
              <div style={{ fontSize: 12, color: row.clockIn ? '#222' : '#ccc', textAlign: 'right' }}>{row.clockIn || '--'}</div>
              <div style={{ fontSize: 12, color: row.clockOut ? '#222' : '#ccc', textAlign: 'right' }}>{row.clockOut || '--'}</div>
              <div style={{ fontSize: 12, fontWeight: 500, textAlign: 'right' }}>{row.workDisplay || '--'}</div>
              <div>{statusBadge(row.status)}</div>
            </div>
            {(row.status === 'pending' || row.status === 'leave_pending') && (
              <div style={{ padding: '6px 14px 10px', borderBottom: '0.5px solid #eee', background: '#fffaf5' }}>
                {renderApplyDetail(row)}
                {row.reason && (
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                    {row.reason.replace(/\s*\[申請内容:.*\]/, '').trim()}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleApprove(row.logId, 'approved')} style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 500, background: '#E6F7EE', color: '#1A7A4A', border: '0.5px solid #7DC4A0', borderRadius: 6, cursor: 'pointer' }}>承認</button>
                  <button onClick={() => handleApprove(row.logId, 'rejected')} style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 500, background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F09595', borderRadius: 6, cursor: 'pointer' }}>差戻し</button>
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );

  // ── 社員一覧画面 ──────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <div style={s.topTitle}>管理者画面</div>
          <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>{user?.name}</span>
          <button onClick={logout} style={{ border: 'none', background: 'none', fontSize: 13, color: '#888', cursor: 'pointer' }}>ログアウト</button>
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
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: emp.pendingCount > 0 ? '#FFF4E5' : '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: emp.pendingCount > 0 ? '#A05A00' : '#185FA5', flexShrink: 0 }}>
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
                } catch(err) {
                  alert('エラー：' + err.message);
                }
              }}
              style={{ padding: '10px 0', fontSize: 12, fontWeight: 500, background: '#FFF4E5', color: '#A05A00', border: '0.5px solid #F0C97A', borderRadius: 8, cursor: 'pointer' }}
            >
              この月を締める
            </button>
            <button
              onClick={() => api.adminExportCsv(yearMonth)}
              style={{ padding: '10px 0', fontSize: 12, fontWeight: 500, background: '#E6F7EE', color: '#1A7A4A', border: '0.5px solid #7DC4A0', borderRadius: 8, cursor: 'pointer' }}
            >
              CSV出力
            </button>
          </div>
          <button
            onClick={async () => {
              if (!window.confirm(`${yearMonth.replace('-','年')}月の締めを解除しますか？`)) return;
              try {
                const result = await api.adminOpen(yearMonth);
                alert(result.message);
              } catch(err) {
                alert('エラー：' + err.message);
              }
            }}
            style={{ width: '100%', padding: '10px 0', fontSize: 12, fontWeight: 500, background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F09595', borderRadius: 8, cursor: 'pointer' }}
          >
            締めを解除する
          </button>
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