import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const toYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatDateJp = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['日','月','火','水','木','金','土'];
  return `${d.getMonth()+1}/${d.getDate()}（${days[d.getDay()]}）`;
};

export default function MyPage() {
  const { user } = useAuth();
  const [yearMonth, setYearMonth]   = useState(toYearMonth());
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [editRow, setEditRow]       = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editBreaks, setEditBreaks] = useState({ am: false, noon: false, pm: false });
  const [holMode, setHolMode]       = useState(false);
  const [subMode, setSubMode] = useState(null); // 'work' | 'holiday' | null
  const [reason, setReason]         = useState('');
  const [message, setMessage]       = useState('');

  useEffect(() => { loadMonthly(); }, [yearMonth]);

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

  const openEdit = (row) => {
    setEditRow(row);
    setEditFields({ clockIn: row.clockIn || '', clockOut: row.clockOut || '', siteId: row.siteId || '' });
    setEditBreaks({ am: row.breaks?.am || false, noon: row.breaks?.noon || false, pm: row.breaks?.pm || false });
    setHolMode(row.status === 'leave' || row.status === 'leave_pending');
    setReason('');
    setMessage('');
  };

  const closeEdit = () => { setEditRow(null); setMessage(''); };

  const handleSave = async () => {
    setMessage('');
    try {
      if (holMode) {
        await api.leaveApply(editRow.date, reason || '有給申請');
        setMessage('有給申請を送信しました');
      } else if (subMode === 'work') {
        await api.apply(
          editRow.date,
          editFields.clockIn,
          editFields.clockOut,
          editFields.siteId,
          { breakAm: editBreaks.am ? 'true' : 'false', breakNoon: editBreaks.noon ? 'true' : 'false', breakPm: editBreaks.pm ? 'true' : 'false' },
          reason || '振替出勤申請',
          'substitute_work'
        );
        setMessage('振替出勤申請を送信しました');
      } else if (subMode === 'holiday') {
        await api.apply(
          editRow.date,
          editFields.clockIn || '00:00',
          editFields.clockOut || '00:00',
          editFields.siteId,
          { breakAm: 'false', breakNoon: 'false', breakPm: 'false' },
          reason || '振替休日申請',
          'substitute_holiday'
        );
        setMessage('振替休日申請を送信しました');
      } else {
        await api.apply(
          editRow.date,
          editFields.clockIn,
          editFields.clockOut,
          editFields.siteId,
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

  const statusBadge = (status) => {
    const map = {
      confirmed:     { label: '確定', bg: '#E6F7EE', color: '#1A7A4A' },
      pending:       { label: '申請中', bg: '#FCEBEB', color: '#A32D2D' },
      leave:         { label: '有給', bg: '#E6F1FB', color: '#185FA5' },
      leave_pending: { label: '有給申請中', bg: '#FFF4E5', color: '#A05A00' },
      rejected:      { label: '差戻し', bg: '#FCEBEB', color: '#A32D2D' },
      substitute_work:    { label: '振替出勤', bg: '#FFF4E5', color: '#A05A00' },
    substitute_holiday: { label: '振替休日', bg: '#E6F1FB', color: '#185FA5' },
    };
    const s = map[status] || { label: status, bg: '#f5f5f5', color: '#888' };
    return <span style={{ fontSize: 10, borderRadius: 3, padding: '1px 5px', background: s.bg, color: s.color }}>{s.label}</span>;
  };

  if (editRow) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <button onClick={closeEdit} style={s.backBtn}>‹ 戻る</button>
          <div style={s.topTitle}>{formatDateJp(editRow.date)} 編集</div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={s.flabel}>出勤・退勤時刻</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <input type="time" value={editFields.clockIn} onChange={e => setEditFields(f => ({...f, clockIn: e.target.value}))} style={s.timeInput} disabled={holMode} />
            <input type="time" value={editFields.clockOut} onChange={e => setEditFields(f => ({...f, clockOut: e.target.value}))} style={s.timeInput} disabled={holMode} />
          </div>
          <div style={s.flabel}>取得できた休憩</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12, opacity: holMode ? 0.35 : 1, pointerEvents: holMode ? 'none' : 'auto' }}>
            {[{k:'am',l:'AM休憩',m:'15分'},{k:'noon',l:'昼休憩',m:'60分'},{k:'pm',l:'PM休憩',m:'15分'}].map(({k,l,m}) => (
              <button key={k} onClick={() => setEditBreaks(b => ({...b, [k]: !b[k]}))} style={{ ...s.breakBtn, background: editBreaks[k] ? '#E6F1FB' : 'white', borderColor: editBreaks[k] ? '#185FA5' : '#ddd' }}>
                <span style={{ fontSize: 12, fontWeight: 500, display: 'block', color: editBreaks[k] ? '#185FA5' : '#888' }}>{l}</span>
                <span style={{ fontSize: 10, color: editBreaks[k] ? '#185FA5' : '#aaa' }}>{m}</span>
              </button>
            ))}
          </div>
          <div style={s.flabel}>申請理由</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="例：打刻忘れのため" style={s.textarea} rows={2} />
          <hr style={{ border: 'none', borderTop: '0.5px solid #eee', margin: '4px 0 12px' }} />
          <div style={s.flabel}>有給申請</div>
          <button onClick={() => setHolMode(h => !h)} style={{ ...s.holBtn, background: holMode ? '#FFF4E5' : '#E6F1FB', borderColor: holMode ? '#F0A500' : '#185FA5', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: holMode ? '#A05A00' : '#185FA5' }}>
              {holMode ? '有給申請中（タップで取消）' : 'この日を有給にする'}
            </span>
          </button>
          {message && <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: message.startsWith('エラー') ? '#FCEBEB' : '#E6F7EE', color: message.startsWith('エラー') ? '#A32D2D' : '#1A7A4A' }}>{message}</div>}
          <button onClick={handleSave} style={s.saveBtn}>
            {holMode ? '有給申請する' : '申請・保存する'}
          </button>
          <button onClick={closeEdit} style={s.cancelBtn}>キャンセル</button>

          <hr style={{ border: 'none', borderTop: '0.5px solid #eee', margin: '12px 0' }} />
          <div style={s.flabel}>振替申請</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => setSubMode(m => m === 'work' ? null : 'work')}
              style={{
                borderRadius: 8, padding: '10px 8px', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: '0.5px solid',
                background: subMode === 'work' ? '#FFF4E5' : 'white',
                borderColor: subMode === 'work' ? '#F0A500' : '#ddd',
                color: subMode === 'work' ? '#A05A00' : '#888',
              }}
            >
              {subMode === 'work' ? '振替出勤申請中' : '振替出勤にする'}
            </button>
            <button
              onClick={async () => {
                if (subMode === 'holiday') { setSubMode(null); return; }
                try {
                  const bal = await api.substituteBalance();
                  if (bal.balance <= 0) {
                    setMessage('エラー: 振替出勤の残数が0です');
                    return;
                  }
                  setSubMode('holiday');
                } catch(err) {
                  setMessage('エラー: ' + err.message);
                }
              }}
              style={{
                borderRadius: 8, padding: '10px 8px', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: '0.5px solid',
                background: subMode === 'holiday' ? '#E6F1FB' : 'white',
                borderColor: subMode === 'holiday' ? '#185FA5' : '#ddd',
                color: subMode === 'holiday' ? '#185FA5' : '#888',
              }}
            >
              {subMode === 'holiday' ? '振替休日申請中' : '振替休日にする'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <div style={s.topTitle}>マイページ</div>
          <span style={{ fontSize: 12, color: '#888' }}>{user?.name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '0.5px solid #eee' }}>
          <button onClick={() => changeMonth(-1)} style={s.monthBtn}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 500 }}>{yearMonth.replace('-', '年')}月</div>
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

        <div style={{ display: 'grid', gridTemplateColumns: '52px 46px 46px 1fr 36px', gap: 3, padding: '5px 14px', background: '#f5f5f5', borderBottom: '0.5px solid #eee' }}>
          {['日付','出勤','退勤','実働','区分'].map(h => <span key={h} style={{ fontSize: 10, color: '#aaa' }}>{h}</span>)}
        </div>

        {loading && <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>読み込み中...</div>}

        {data?.rows.map(row => (
          <div key={row.logId} onClick={() => openEdit(row)} style={{ display: 'grid', gridTemplateColumns: '52px 46px 46px 1fr 36px', gap: 3, padding: '9px 14px', borderBottom: '0.5px solid #eee', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 12, color: '#666' }}>{formatDateJp(row.date)}</div>
            <div style={{ fontSize: 12, color: row.clockIn ? '#222' : '#ccc', textAlign: 'right' }}>{row.clockIn || '--'}</div>
            <div style={{ fontSize: 12, color: row.clockOut ? '#222' : '#ccc', textAlign: 'right' }}>{row.clockOut || '--'}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#222', textAlign: 'right' }}>{row.workDisplay || '--'}</div>
            <div>{statusBadge(row.status)}</div>
          </div>
        ))}

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