import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const toYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

const getDaysInMonth = (yearMonth) => {
  const [y, m] = yearMonth.split('-').map(Number);
  const days = [];
  const count = new Date(y, m, 0).getDate();
  for (let i = 1; i <= count; i++) {
    const d = new Date(y, m - 1, i);
    days.push({
      date: `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`,
      dow: d.getDay(),
    });
  }
  return days;
};

const DOW = ['日','月','火','水','木','金','土'];

const formatDateJp = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth()+1}/${d.getDate()}（${DOW[d.getDay()]}）`;
};

const STATUS_MAP = {
  confirmed:          { label: '確定',      bg: '#E6F7EE', color: '#1A7A4A' },
  pending:            { label: '申請中',    bg: '#FCEBEB', color: '#A32D2D' },
  leave:              { label: '有給',      bg: '#E6F1FB', color: '#1855A0' },
  leave_pending:      { label: '有給申請中', bg: '#FFF4E5', color: '#A05A00' },
  rejected:           { label: '差戻し',    bg: '#FCEBEB', color: '#A32D2D' },
  substitute_work:    { label: '振替出勤',  bg: '#FFF4E5', color: '#A05A00' },
  substitute_holiday: { label: '振替休日',  bg: '#E6F1FB', color: '#1855A0' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || { label: status || '未打刻', bg: '#f5f5f5', color: '#bbb' };
  return <span style={{ fontSize: 10, borderRadius: 3, padding: '1px 5px', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>;
};

export default function MyPage() {
  const { user } = useAuth();
  const [yearMonth, setYearMonth]   = useState(toYearMonth());
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [editRow, setEditRow]       = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editSites, setEditSites]   = useState([{siteId:'',minutes:''},{siteId:'',minutes:''},{siteId:'',minutes:''}]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [editBreaks, setEditBreaks] = useState({ am: false, noon: false, pm: false });
  const [holMode, setHolMode]       = useState(false);
  const [subMode, setSubMode]       = useState(null);
  const [reason, setReason]         = useState('');
  const [message, setMessage]       = useState('');
  const [pwMode, setPwMode]           = useState(false);
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [pwMessage, setPwMessage]     = useState('');

  useEffect(() => { loadMonthly(); }, [yearMonth]);
  useEffect(() => {
    api.sites().then(setSiteOptions).catch(() => {});
  }, []);

  const loadMonthly = async () => {
    setLoading(true);
    try {
      const result = await api.monthly(yearMonth);
      setData(result);
    } catch (err) {
      console.log('月次取得エラー:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (delta) => {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  };

  // 日付ごとのデータをマップ化
  const rowMap = {};
  if (data?.rows) {
    data.rows.forEach(r => { 
      if (!rowMap[r.date]) rowMap[r.date] = r;
    });
  }

  const openEdit = (date, row) => {
    setEditRow({ date, ...(row || {}) });
    setEditFields({ clockIn: row?.clockIn || '', clockOut: row?.clockOut || '' });
    setEditBreaks({ am: row?.breaks?.am || false, noon: row?.breaks?.noon || false, pm: row?.breaks?.pm || false });
    setEditSites([
      { siteId: row?.site1Id || '', days: minToDays(row?.site1Min) },
      { siteId: row?.site2Id || '', days: minToDays(row?.site2Min) },
      { siteId: row?.site3Id || '', days: minToDays(row?.site3Min) },
    ]);
    setHolMode(row?.status === 'leave' || row?.status === 'leave_pending');
    setSubMode(null);
    setReason('');
    setMessage('');
  };

  const closeEdit = () => { setEditRow(null); setMessage(''); };

  const handleSave = async () => {
    setMessage('');
    const editSitesForApi = editSites.map(s => ({
      siteId: s.siteId,
      minutes: daysToMin(s.days),
    }));
    try {
      if (holMode) {
        await api.leaveApply(editRow.date, reason || '有給申請');
        setMessage('有給申請を送信しました');
      } else if (subMode === 'work') {
        await api.apply(
          editRow.date, editFields.clockIn, editFields.clockOut, editSitesForApi,
          { breakAm: editBreaks.am ? 'true' : 'false', breakNoon: editBreaks.noon ? 'true' : 'false', breakPm: editBreaks.pm ? 'true' : 'false' },
          reason || '振替出勤申請', 'substitute_work'
        );
        setMessage('振替出勤申請を送信しました');
      } else if (subMode === 'holiday') {
        await api.apply(
          editRow.date, '00:00', '00:00', editSitesForApi,
          { breakAm: 'false', breakNoon: 'false', breakPm: 'false' },
          reason || '振替休日申請', 'substitute_holiday'
        );
        setMessage('振替休日申請を送信しました');
      } else {
        await api.apply(
          editRow.date, editFields.clockIn, editFields.clockOut, editSitesForApi,
          { breakAm: editBreaks.am ? 'true' : 'false', breakNoon: editBreaks.noon ? 'true' : 'false', breakPm: editBreaks.pm ? 'true' : 'false' },
          reason || '修正申請'
        );
        setMessage('申請を送信しました');
      }
      await loadMonthly();
      setTimeout(closeEdit, 1500);
    } catch (err) {
      setMessage('エラー: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('この打刻申請を削除しますか？')) return;
    try {
      await api.attendanceDelete(editRow.logId);
      await loadMonthly();
      closeEdit();
    } catch(err) {
      setMessage('エラー: ' + err.message);
    }
  };

  // ── 編集画面 ──────────────────────────────────────────
  if (pwMode) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <button onClick={() => { setPwMode(false); setPwMessage(''); }} style={s.backBtn}>‹ 戻る</button>
          <div style={s.topTitle}>パスワード変更</div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={s.flabel}>現在のパスワード</div>
          <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="現在のパスワード" style={{ ...s.timeInput, marginBottom: 12 }} />
          <div style={s.flabel}>新しいパスワード</div>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="新しいパスワード" style={{ ...s.timeInput, marginBottom: 12 }} />
          {pwMessage && <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: pwMessage.startsWith('エラー') ? '#FCEBEB' : '#E6F7EE', color: pwMessage.startsWith('エラー') ? '#A32D2D' : '#1A7A4A' }}>{pwMessage}</div>}
          <button onClick={async () => {
            setPwMessage('');
            try {
              const result = await api.changePassword(currentPw, newPw);
              setPwMessage(result.message);
              setTimeout(() => { setPwMode(false); setPwMessage(''); setCurrentPw(''); setNewPw(''); }, 1500);
            } catch(err) { setPwMessage('エラー: ' + err.message); }
          }} style={s.saveBtn}>変更する</button>
          <button onClick={() => { setPwMode(false); setPwMessage(''); }} style={s.cancelBtn}>キャンセル</button>
        </div>
      </div>
    </div>
  );

  if (editRow) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <button onClick={closeEdit} style={s.backBtn}>‹ 戻る</button>
          <div style={s.topTitle}>{formatDateJp(editRow.date)} 編集</div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={s.flabel}>現場・滞在時間</div>
          {editSites.map((site, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 6, marginBottom: 6, opacity: (holMode || subMode === 'holiday') ? 0.35 : 1, pointerEvents: (holMode || subMode === 'holiday') ? 'none' : 'auto' }}>
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
            <input type="time" value={editFields.clockIn} onChange={e => setEditFields(f => ({...f, clockIn: e.target.value}))} style={s.timeInput} disabled={holMode || subMode === 'holiday'} />
            <input type="time" value={editFields.clockOut} onChange={e => setEditFields(f => ({...f, clockOut: e.target.value}))} style={s.timeInput} disabled={holMode || subMode === 'holiday'} />
          </div>
          <div style={s.flabel}>取得できた休憩</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12, opacity: (holMode || subMode === 'holiday') ? 0.35 : 1, pointerEvents: (holMode || subMode === 'holiday') ? 'none' : 'auto' }}>
            {[{k:'am',l:'AM休憩',m:'15分'},{k:'noon',l:'昼休憩',m:'60分'},{k:'pm',l:'PM休憩',m:'15分'}].map(({k,l,m}) => (
              <button key={k} onClick={() => setEditBreaks(b => ({...b, [k]: !b[k]}))} style={{ ...s.breakBtn, background: editBreaks[k] ? '#E6F1FB' : 'white', borderColor: editBreaks[k] ? '#1855A0' : '#ddd' }}>
                <span style={{ fontSize: 12, fontWeight: 500, display: 'block', color: editBreaks[k] ? '#1855A0' : '#888' }}>{l}</span>
                <span style={{ fontSize: 10, color: editBreaks[k] ? '#1855A0' : '#aaa' }}>{m}</span>
              </button>
            ))}
          </div>
          <div style={s.flabel}>申請理由</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="例：打刻忘れのため" style={s.textarea} rows={2} />

          <hr style={{ border: 'none', borderTop: '0.5px solid #eee', margin: '4px 0 12px' }} />
          <div style={s.flabel}>有給申請</div>
          <button onClick={() => { setHolMode(h => !h); setSubMode(null); }} style={{ ...s.holBtn, background: holMode ? '#FFF4E5' : '#E6F1FB', borderColor: holMode ? '#F0A500' : '#1855A0', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: holMode ? '#A05A00' : '#1855A0' }}>
              {holMode ? '有給申請中（タップで取消）' : 'この日を有給にする'}
            </span>
          </button>

          <div style={s.flabel}>振替申請</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => { setSubMode(m => m === 'work' ? null : 'work'); setHolMode(false); }}
              style={{ borderRadius: 8, padding: '10px 8px', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid', background: subMode === 'work' ? '#FFF4E5' : 'white', borderColor: subMode === 'work' ? '#F0A500' : '#ddd', color: subMode === 'work' ? '#A05A00' : '#888' }}
            >
              {subMode === 'work' ? '振替出勤申請中' : '振替出勤にする'}
            </button>
            <button
              onClick={async () => {
                if (subMode === 'holiday') { setSubMode(null); return; }
                try {
                  const bal = await api.substituteBalance();
                  if (bal.balance <= 0) { setMessage('エラー: 振替出勤の残数が0です'); return; }
                  setSubMode('holiday'); setHolMode(false);
                } catch(err) { setMessage('エラー: ' + err.message); }
              }}
              style={{ borderRadius: 8, padding: '10px 8px', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid', background: subMode === 'holiday' ? '#E6F1FB' : 'white', borderColor: subMode === 'holiday' ? '#1855A0' : '#ddd', color: subMode === 'holiday' ? '#1855A0' : '#888' }}
            >
              {subMode === 'holiday' ? '振替休日申請中' : '振替休日にする'}
            </button>
          </div>

          {message && <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: message.startsWith('エラー') ? '#FCEBEB' : '#E6F7EE', color: message.startsWith('エラー') ? '#A32D2D' : '#1A7A4A' }}>{message}</div>}
          <button onClick={handleSave} style={s.saveBtn}>
            {holMode ? '有給申請する' : subMode === 'work' ? '振替出勤申請する' : subMode === 'holiday' ? '振替休日申請する' : '申請・保存する'}
          </button>
          <button onClick={closeEdit} style={s.cancelBtn}>キャンセル</button>

          {editRow?.status === 'rejected' && (
            <button onClick={handleDelete} style={{ width: '100%', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 500, background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F09595', cursor: 'pointer', marginTop: 8 }}>
              この申請を削除する
            </button>
          )}


        </div>
      </div>
    </div>
  );

  // ── 一覧画面 ──────────────────────────────────────────
  const days = getDaysInMonth(yearMonth);
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <div style={s.topTitle}>マイページ</div>
          <button onClick={() => setPwMode(true)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: 'white', color: '#888', cursor: 'pointer', marginRight: 6 }}>PW変更</button>
          <span style={{ fontSize: 12, color: '#888' }}>{user?.name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '0.5px solid #eee' }}>
          <button onClick={() => changeMonth(-1)} style={s.monthBtn}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 500 }}>{yearMonth.replace('-','年')}月</div>
          <button onClick={() => changeMonth(1)} style={s.monthBtn}>›</button>
        </div>

        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '10px 14px', borderBottom: '0.5px solid #eee' }}>
            {[
              { label: '総労働時間', value: data.summary.totalHours + 'h' },
              { label: '時間外（25%）', value: data.summary.overtimeHours + 'h', warn: data.summary.overtimeHours > 0 },
              { label: '深夜（25%）', value: data.summary.nightHours + 'h' },
              { label: '有給残日数', value: data.leaveBalance + '日', ok: true },
            ].map(({ label, value, warn, ok }) => (
              <div key={label} style={{ background: '#f9f9f9', borderRadius: 7, padding: '7px 10px' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: warn ? '#A05A00' : ok ? '#1A7A4A' : '#222' }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: 720 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '52px 46px 46px 60px 42px 120px 140px 140px 140px', gap: 3, padding: '5px 14px', background: '#f5f5f5', borderBottom: '0.5px solid #eee' }}>
              <span style={{ fontSize: 10, color: '#aaa', position: 'sticky', left: 14, background: '#f5f5f5', zIndex: 1 }}>日付</span>
              {['出勤','退勤','実働','区分','休憩','現場1','現場2','現場3'].map(h => <span key={h} style={{ fontSize: 10, color: '#aaa' }}>{h}</span>)}
            </div>

        {loading && <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>読み込み中...</div>}

        {!loading && days.map(({ date, dow }) => {
          const row = rowMap[date];
          const isToday = date === todayStr;
          const isSun = dow === 0;
          const isSat = dow === 6;
          const dateColor = isSun ? '#E24B4A' : isSat ? '#1855A0' : '#666';
          const bgColor = isToday ? '#F5F9FF' : 'white';

          // 休憩表示
          const breakParts = [
            row?.breaks?.am   && 'AM',
            row?.breaks?.noon && '昼',
            row?.breaks?.pm   && 'PM',
          ].filter(Boolean);
          const breakMin = (row?.breaks?.am ? 15 : 0) + (row?.breaks?.noon ? 60 : 0) + (row?.breaks?.pm ? 15 : 0);
          const breakLabel = breakParts.length ? `${breakParts.join('+')} ${breakMin}分` : '--';

          // 現場名取得
          const siteName = (siteId) => siteOptions.find(s => s.siteId === siteId)?.siteName || '';
          const siteDisplay = (id, min) => {
            if (!id) return '--';
            const name = siteName(id);
            const days = min ? (min / 450) : 0;
            return `${name} ${days}日`;
          };

          // 申請内容の解析（申請中の場合）
          const applyMatch = row?.reason && row.reason.match(/\[申請内容:(.*)\]/);
          let applyDetail = null;
          if (applyMatch && (row.status === 'pending' || row.status === 'leave_pending')) {
            try {
              const a = JSON.parse(applyMatch[1]);
              const fmtBrk = (am, noon, pm) => {
                const parts = [am && 'AM', noon && '昼', pm && 'PM'].filter(Boolean);
                const min = (am?15:0) + (noon?60:0) + (pm?15:0);
                return parts.length ? `${parts.join('+')} ${min}分` : 'なし';
              };
              const fmtSts = (s1id, s1m, s2id, s2m, s3id, s3m) => {
                const parts = [];
                if (s1id) parts.push(`${siteName(s1id)} ${Number(s1m)/450}日`);
                if (s2id) parts.push(`${siteName(s2id)} ${Number(s2m)/450}日`);
                if (s3id) parts.push(`${siteName(s3id)} ${Number(s3m)/450}日`);
                return parts.length ? parts.join(' / ') : 'なし';
              };
              applyDetail = {
                beforeTime: (row.clockIn || row.clockOut) ? `${row.clockIn || '--'}〜${row.clockOut || '--'}` : '打刻なし',
                beforeBreak: fmtBrk(row.breaks?.am, row.breaks?.noon, row.breaks?.pm),
                beforeSites: fmtSts(row.site1Id, row.site1Min, row.site2Id, row.site2Min, row.site3Id, row.site3Min),
                afterTime: (a.clockIn || a.clockOut) ? `${a.clockIn || '--'}〜${a.clockOut || '--'}` : '打刻なし',
                afterBreak: fmtBrk(a.breakAm === 'true', a.breakNoon === 'true', a.breakPm === 'true'),
                afterSites: fmtSts(a.site1Id, a.site1Min, a.site2Id, a.site2Min, a.site3Id, a.site3Min),
              };
            } catch(e) {}
          }

          return (
            <div key={date}>
              <div
                onClick={() => openEdit(date, row || null)}
                style={{
                  display: 'grid', gridTemplateColumns: '52px 46px 46px 60px 42px 120px 140px 140px 140px',
                  gap: 3, padding: '8px 14px',
                  borderBottom: applyDetail ? 'none' : '0.5px solid #eee',
                  alignItems: 'center', cursor: 'pointer',
                  background: bgColor,
                }}
              >
                <div style={{ fontSize: 12, color: dateColor, fontWeight: isToday ? 500 : 400, position: 'sticky', left: 14, background: bgColor, zIndex: 1 }}>
                  {`${date.slice(5,7).replace(/^0/,'')}/${date.slice(8,10).replace(/^0/,'')}（${DOW[dow]}）`}
                </div>
                <div style={{ fontSize: 12, color: row?.clockIn ? '#222' : '#ddd', textAlign: 'right' }}>{row?.clockIn || '--'}</div>
                <div style={{ fontSize: 12, color: row?.clockOut ? '#222' : '#ddd', textAlign: 'right' }}>{row?.clockOut ? (row.clockIn && row.clockOut < row.clockIn ? `翌${row.clockOut}` : row.clockOut) : '--'}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#222', textAlign: 'right' }}>{row?.workDisplay || '--'}</div>
                <div><StatusBadge status={row?.status} /></div>
                <div style={{ fontSize: 11, color: row?.clockIn ? '#666' : '#ddd' }}>{row ? breakLabel : '--'}</div>
                <div style={{ fontSize: 11, color: row?.site1Id ? '#666' : '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row ? siteDisplay(row.site1Id, row.site1Min) : '--'}</div>
                <div style={{ fontSize: 11, color: row?.site2Id ? '#666' : '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row ? siteDisplay(row.site2Id, row.site2Min) : '--'}</div>
                <div style={{ fontSize: 11, color: row?.site3Id ? '#666' : '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row ? siteDisplay(row.site3Id, row.site3Min) : '--'}</div>
              </div>
              {applyDetail && (
                <div style={{ padding: '6px 14px 10px', borderBottom: '0.5px solid #eee', background: '#fffaf5' }}>
                  <div style={{ fontSize: 11, background: '#f5f5f5', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px', alignItems: 'start' }}>
                      <div style={{ color: '#aaa' }}>【申請前】</div>
                      <div style={{ color: '#888' }}>
                        <div>{applyDetail.beforeTime}</div>
                        <div>休憩: {applyDetail.beforeBreak}</div>
                        <div>現場: {applyDetail.beforeSites}</div>
                      </div>
                      <div style={{ color: '#A05A00', fontWeight: 500, marginTop: 6 }}>【申請後】</div>
                      <div style={{ color: '#222', marginTop: 6 }}>
                        <div>{applyDetail.afterTime}</div>
                        <div>休憩: {applyDetail.afterBreak}</div>
                        <div>現場: {applyDetail.afterSites}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
        </div>

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}

const s = {
  page:      { minHeight: '100svh', background: '#f5f5f5', display: 'flex', justifyContent: 'center', padding: '1rem 1rem 80px' },
  card:      { background: 'white', border: '0.5px solid #eee', borderRadius: 16, width: '100%', maxWidth: 400, alignSelf: 'flex-start', overflow: 'hidden' },
  topbar:    { background: '#f9f9f9', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid #eee' },
  topTitle:  { fontSize: 14, fontWeight: 500, color: '#222', flex: 1 },
  backBtn:   { border: 'none', background: 'none', fontSize: 18, color: '#888', cursor: 'pointer', padding: 0 },
  monthBtn:  { border: 'none', background: 'none', fontSize: 20, color: '#888', cursor: 'pointer', padding: '0 4px' },
  flabel:    { fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 4 },
  timeInput: { border: '0.5px solid #ddd', borderRadius: 8, padding: '9px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' },
  breakBtn:  { border: '0.5px solid', borderRadius: 8, padding: '8px 4px', textAlign: 'center', cursor: 'pointer' },
  textarea:  { border: '0.5px solid #ddd', borderRadius: 8, padding: '9px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit', marginBottom: 12 },
  saveBtn:   { width: '100%', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 500, background: '#E6F7EE', color: '#1A7A4A', border: '1.5px solid #7DC4A0', cursor: 'pointer', marginBottom: 8 },
  cancelBtn: { width: '100%', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 500, background: 'white', color: '#888', border: '0.5px solid #ddd', cursor: 'pointer', marginBottom: 0 },
  holBtn:    { width: '100%', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '0.5px solid' },
};