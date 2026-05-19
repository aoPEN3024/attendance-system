
import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const nowTime = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

export default function PunchPage() {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(nowTime());
  const [todayData, setTodayData]     = useState(null);
  const [sites, setSites]             = useState([]);
  const [siteId, setSiteId]           = useState('');
  const [breaks, setBreaks]           = useState({ breakAm: false, breakNoon: false, breakPm: false });
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState('');
  const [isSubstitute, setIsSubstitute] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(nowTime()), 1000);
    loadTodayData();
    loadSites();
    return () => clearInterval(timer);
  }, []);

const loadTodayData = async () => {
  try {
    const data = await api.today(today());
    console.log('今日のデータ:', data);
    if (data.workMinutes) {
      const h = Math.floor(data.workMinutes / 60);
      const m = data.workMinutes % 60;
      data.workDisplay = m === 0 ? h + 'h' : h + 'h' + m + 'm';
    } else {
      data.workDisplay = '--';
    }
    setTodayData(data);
    if (data.siteId) setSiteId(data.siteId);
    if (data.breaks) {
      console.log('休憩データ:', data.breaks);
      setBreaks({
        breakAm:   data.breaks.am   === true,
        breakNoon: data.breaks.noon === true,
        breakPm:   data.breaks.pm   === true,
      });
    }
  } catch (err) {
    console.log('今日のデータ取得エラー:', err.message);
  }
};  

  const loadSites = async () => {
  try {
    const data = await api.sites();
    console.log('現場データ:', data);
    setSites(data);
  } catch (err) {
    console.log('現場取得エラー:', err.message);
  }
};

  const handlePunch = async (type) => {
  setLoading(true);
  setMessage('');
  try {
    const result = await api.punch(
      type,
      today(),
      nowTime(),
      siteId,
      { breakAm: 'false', breakNoon: 'false', breakPm: 'false' },
      isSubstitute && type === 'clockIn' ? 'substitute_work' : null
    );
    setMessage(result.message);
    await loadTodayData();
  } catch (err) {
    setMessage('エラー: ' + err.message);
  } finally {
    setLoading(false);
  }
};

const toggleBreak = async (key) => {
  const newBreaks = { ...breaks, [key]: !breaks[key] };
  setBreaks(newBreaks);
  console.log('休憩ボタン押した:', key, newBreaks);

  if (todayData?.clockIn) {
    try {
      const result = await api.punch(
        'updateBreak',
        today(),
        nowTime(),
        siteId,
        {
          breakAm:   newBreaks.breakAm   ? 'true' : 'false',
          breakNoon: newBreaks.breakNoon ? 'true' : 'false',
          breakPm:   newBreaks.breakPm   ? 'true' : 'false',
        }
      );
      console.log('休憩更新結果:', result);
      await loadTodayData();
    } catch (err) {
      console.log('休憩更新エラー:', err.message);
    }
  } else {
    console.log('出勤前なのでGASに送らない');
  }
};

  const breakTotal = (breaks.breakAm ? 15 : 0) + (breaks.breakNoon ? 60 : 0) + (breaks.breakPm ? 15 : 0);
  const breakLabel = [
    breaks.breakAm   && 'AM',
    breaks.breakNoon && '昼',
    breaks.breakPm   && 'PM',
  ].filter(Boolean).join(' + ') || 'なし';

  const alreadyIn  = !!todayData?.clockIn;
  const alreadyOut = !!todayData?.clockOut;

  const s = styles;

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* ヘッダー */}
        <div style={s.topbar}>
          <div>
            <div style={s.empName}>
              <i className="ti ti-user" style={{ fontSize: 13, marginRight: 4 }} aria-hidden="true" />
              {user?.name}
            </div>
            <div style={s.dateLabel}>{formatDateJp(today())}</div>
          </div>
          <button onClick={logout} style={s.logoutBtn} aria-label="ログアウト">
            <i className="ti ti-logout" style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* 時刻表示 */}
        <div style={s.timeArea}>
          <div style={s.timeBig}>{currentTime}</div>
          <div style={s.timeSub}>現在時刻</div>
          <div style={s.todayRow}>
            {[
              { label: '出勤', value: todayData?.clockIn || '--:--', done: alreadyIn },
              { label: '退勤', value: todayData?.clockOut || '--:--', done: alreadyOut },
              { label: '実働', value: todayData?.workDisplay || '--', done: alreadyOut },
            ].map(({ label, value, done }) => (
              <div key={label} style={s.todayCell}>
                <div style={s.todayCellLabel}>{label}</div>
                <div style={{ ...s.todayCellVal, color: done ? 'var(--color-text-success)' : 'var(--color-text-primary)' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 出退勤ボタン */}
        <div style={s.punchRow}>
          <button
            onClick={() => handlePunch('clockIn')}
            disabled={loading || alreadyIn}
            style={{
              ...s.punchBtn,
              background: alreadyIn ? 'var(--color-background-secondary)' : 'var(--color-background-success)',
              color:      alreadyIn ? 'var(--color-text-tertiary)' : 'var(--color-text-success)',
              border:     alreadyIn ? '1.5px solid var(--color-border-tertiary)' : '1.5px solid var(--color-border-success)',
            }}
          >
            <i className={alreadyIn ? 'ti ti-check' : 'ti ti-login'} style={{ fontSize: 18, display: 'block', margin: '0 auto 4px' }} aria-hidden="true" />
            {alreadyIn ? '出勤済み' : '出勤する'}
          </button>
          <button
            onClick={() => handlePunch('clockOut')}
            disabled={loading || !alreadyIn || alreadyOut}
            style={{
              ...s.punchBtn,
              background: (!alreadyIn || alreadyOut) ? 'var(--color-background-secondary)' : 'var(--color-background-danger)',
              color:      (!alreadyIn || alreadyOut) ? 'var(--color-text-tertiary)' : 'var(--color-text-danger)',
              border:     (!alreadyIn || alreadyOut) ? '1.5px solid var(--color-border-tertiary)' : '1.5px solid var(--color-border-danger)',
            }}
          >
            <i className="ti ti-logout" style={{ fontSize: 18, display: 'block', margin: '0 auto 4px' }} aria-hidden="true" />
            {alreadyOut ? '退勤済み' : '退勤する'}
          </button>
        </div>

        <div style={s.divider} />

        {/* 現場選択 */}
        <div style={s.section}>
          <div style={s.sectionLabel}>現場</div>
          <div style={s.selectWrap}>
            <i className="ti ti-building" style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginRight: 8 }} aria-hidden="true" />
            <select
              value={siteId}
              onChange={e => setSiteId(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'none', fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }}
            >
              <option value="">現場を選択...</option>
              {sites.map(s => <option key={s.siteId} value={s.siteId}>{s.siteName}</option>)}
            </select>
          </div>

          {/* 振替出勤 */}
          <div style={s.sectionLabel}>振替出勤</div>
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setIsSubstitute(prev => !prev)}
              style={{
                width: '100%',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '0.5px solid',
                background: isSubstitute ? '#FFF4E5' : 'var(--color-background-primary)',
                borderColor: isSubstitute ? '#F0A500' : 'var(--color-border-secondary)',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: isSubstitute ? '#A05A00' : 'var(--color-text-secondary)' }}>
                {isSubstitute ? '振替出勤として申請中（タップで取消）' : 'この出勤を振替出勤にする'}
              </span>
            </button>
          </div>

          {/* 休憩 */}
          <div style={s.sectionLabel}>取得できた休憩（複数選択可）</div>
          <div style={s.breakGrid}>
            {[
              { key: 'breakAm',   label: 'AM休憩', min: '15分' },
              { key: 'breakNoon', label: '昼休憩',  min: '60分' },
              { key: 'breakPm',   label: 'PM休憩', min: '15分' },
            ].map(({ key, label, min }) => (
              <button
                key={key}
                onClick={() => toggleBreak(key)}
                style={{
                  ...s.breakBtn,
                  background:   breaks[key] ? 'var(--color-background-info)' : 'var(--color-background-primary)',
                  borderColor:  breaks[key] ? 'var(--color-border-info)'      : 'var(--color-border-secondary)',
                }}
              >
                {breaks[key] && <i className="ti ti-check" style={{ position: 'absolute', top: 5, right: 5, fontSize: 11, color: 'var(--color-text-info)' }} aria-hidden="true" />}
                <span style={{ fontSize: 13, fontWeight: 500, display: 'block', color: breaks[key] ? 'var(--color-text-info)' : 'var(--color-text-secondary)' }}>{label}</span>
                <span style={{ fontSize: 11, color: breaks[key] ? 'var(--color-text-info)' : 'var(--color-text-tertiary)' }}>{min}</span>
              </button>
            ))}
          </div>
          <div style={s.breakSummary}>
            取得合計：<span style={{ color: 'var(--color-text-info)', fontWeight: 500 }}>{breakTotal}分</span>
            {breakLabel !== 'なし' && `（${breakLabel}）`}
          </div>
        </div>

        {/* メッセージ */}
        {message && (
          <div style={{
            margin: '0 16px 12px',
            padding: '8px 12px',
            fontSize: 13,
            borderRadius: 8,
            background: message.startsWith('エラー') ? 'var(--color-background-danger)' : 'var(--color-background-success)',
            color:      message.startsWith('エラー') ? 'var(--color-text-danger)'       : 'var(--color-text-success)',
          }}>
            {message}
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '8px 0 14px', fontSize: 12, color: 'var(--color-text-info)', cursor: 'pointer' }}>
          <i className="ti ti-edit" style={{ fontSize: 13, marginRight: 4 }} aria-hidden="true" />
          事後申請・修正はこちら
        </div>

      </div>
    </div>
  );
}

function formatDateJp(dateStr) {
  const d    = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

const styles = {
  page:           { minHeight: '100svh', background: 'var(--color-background-tertiary)', display: 'flex', justifyContent: 'center', padding: '1rem' },
  card:           { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden', alignSelf: 'flex-start' },
  topbar:         { background: 'var(--color-background-secondary)', padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid var(--color-border-tertiary)' },
  empName:        { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' },
  dateLabel:      { fontSize: 12, color: 'var(--color-text-secondary)' },
  logoutBtn:      { border: 'none', background: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 0 },
  timeArea:       { padding: '16px 16px 12px', textAlign: 'center' },
  timeBig:        { fontSize: 40, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: -1, marginBottom: 2 },
  timeSub:        { fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 },
  todayRow:       { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 },
  todayCell:      { background: 'var(--color-background-secondary)', borderRadius: 8, padding: '7px 8px', textAlign: 'center' },
  todayCellLabel: { fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 2 },
  todayCellVal:   { fontSize: 14, fontWeight: 500 },
  punchRow:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 16px 4px' },
  punchBtn:       { borderRadius: 10, padding: '15px 0', textAlign: 'center', fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'opacity .15s' },
  divider:        { height: '0.5px', background: 'var(--color-border-tertiary)', margin: '12px 16px 0' },
  section:        { padding: '12px 16px' },
  sectionLabel:   { fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6, letterSpacing: '0.03em' },
  selectWrap:     { border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, padding: '9px 12px', background: 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', marginBottom: 12 },
  breakGrid:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 4 },
  breakBtn:       { border: '0.5px solid', borderRadius: 8, padding: '10px 4px 8px', textAlign: 'center', cursor: 'pointer', position: 'relative' },
  breakSummary:   { fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', minHeight: 18 },
};
