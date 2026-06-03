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

const emptySite = () => ({ siteId: '', days: '' });

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

export default function PunchPage() {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(nowTime());
  const [todayData, setTodayData]     = useState(null);
  const [siteOptions, setSiteOptions] = useState([]);
  const [sites, setSites]             = useState([emptySite(), emptySite(), emptySite()]);
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
      if (data.workMinutes) {
        const h = Math.floor(data.workMinutes / 60);
        const m = data.workMinutes % 60;
        data.workDisplay = m === 0 ? h + 'h' : h + 'h' + m + 'm';
      } else {
        data.workDisplay = '--';
      }
      setTodayData(data);
      setSites([
        { siteId: data.site1Id || '', days: minToDays(data.site1Min) },
        { siteId: data.site2Id || '', days: minToDays(data.site2Min) },
        { siteId: data.site3Id || '', days: minToDays(data.site3Min) },
      ]);
      if (data.breaks) {
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
      setSiteOptions(data);
    } catch (err) {
      console.log('現場取得エラー:', err.message);
    }
  };

  const handlePunch = async (type) => {
    setLoading(true);
    setMessage('');
    try {
      const sitesForApi = sites.map(s => ({ siteId: s.siteId, minutes: daysToMin(s.days) }));
      const result = await api.punch(
        type, today(), nowTime(),
        sitesForApi,
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

  const updateSite = async (index, field, value) => {
    const newSites = sites.map((s, i) => i === index ? { ...s, [field]: value } : s);
    setSites(newSites);
    if (todayData?.clockIn) {
      try {
        const sitesForApi = newSites.map(s => ({ siteId: s.siteId, minutes: daysToMin(s.days) }));
        await api.punch('updateSites', today(), nowTime(), sitesForApi, {});
      } catch (err) {
        console.log('現場更新エラー:', err.message);
      }
    }
  };

  const toggleBreak = async (key) => {
    const newBreaks = { ...breaks, [key]: !breaks[key] };
    setBreaks(newBreaks);
    if (todayData?.clockIn) {
      try {
        const sitesForApi = sites.map(s => ({ siteId: s.siteId, minutes: daysToMin(s.days) }));
        await api.punch('updateBreak', today(), nowTime(), sitesForApi, {
          breakAm:   newBreaks.breakAm   ? 'true' : 'false',
          breakNoon: newBreaks.breakNoon ? 'true' : 'false',
          breakPm:   newBreaks.breakPm   ? 'true' : 'false',
        });
        await loadTodayData();
      } catch (err) {
        console.log('休憩更新エラー:', err.message);
      }
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
              <i className="ti ti-user" style={{ fontSize: 13, marginRight: 4 }} />
              {user?.name}
            </div>
            <div style={s.dateLabel}>{formatDateJp(today())}</div>
          </div>
          <button onClick={logout} style={s.logoutBtn}>
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
                <div style={{ ...s.todayCellVal, color: done ? '#1A7A4A' : '#222' }}>{value}</div>
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
              background: alreadyIn ? '#f5f5f5' : '#E6F7EE',
              color:      alreadyIn ? '#bbb' : '#1A7A4A',
              border:     alreadyIn ? '1.5px solid #ddd' : '1.5px solid #7DC4A0',
            }}
          >
            <i className={alreadyIn ? 'ti ti-check' : 'ti ti-login'} style={{ fontSize: 18, display: 'block', margin: '0 auto 4px' }} />
            {alreadyIn ? '出勤済み' : '出勤する'}
          </button>
          <button
            onClick={() => handlePunch('clockOut')}
            disabled={loading || !alreadyIn || alreadyOut}
            style={{
              ...s.punchBtn,
              background: (!alreadyIn || alreadyOut) ? '#f5f5f5' : '#FCEBEB',
              color:      (!alreadyIn || alreadyOut) ? '#bbb' : '#A32D2D',
              border:     (!alreadyIn || alreadyOut) ? '1.5px solid #ddd' : '1.5px solid #F09595',
            }}
          >
            <i className="ti ti-logout" style={{ fontSize: 18, display: 'block', margin: '0 auto 4px' }} />
            {alreadyOut ? '退勤済み' : '退勤する'}
          </button>
        </div>

        <div style={s.divider} />

        <div style={s.section}>

          {/* 現場選択（3つ） */}
          <div style={s.sectionLabel}>現場・滞在時間</div>
          {sites.map((site, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 6, marginBottom: 8 }}>
              <div style={s.selectWrap}>
                <i className="ti ti-building" style={{ fontSize: 13, color: '#888', marginRight: 6 }} />
                <select
                  value={site.siteId}
                  onChange={e => updateSite(index, 'siteId', e.target.value)}
                  style={{ flex: 1, border: 'none', background: 'none', fontSize: 13, color: '#222', outline: 'none' }}
                >
                  <option value="">現場{index + 1}を選択</option>
                  {siteOptions.map(s => <option key={s.siteId} value={s.siteId}>{s.siteName}</option>)}
                </select>
              </div>
              <div style={{ ...s.selectWrap, justifyContent: 'center' }}>
                <select
                  value={site.days}
                  onChange={e => updateSite(index, 'days', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'none', fontSize: 13, color: '#222', outline: 'none', textAlign: 'center' }}
                >
                  {DAY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#888', textAlign: 'right', marginBottom: 12 }}>
            合計: <strong>{sites.reduce((sum, s) => sum + (Number(s.days) || 0), 0)}日</strong>
          </div>

          {/* 振替出勤 */}
          <div style={s.sectionLabel}>振替出勤</div>
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setIsSubstitute(prev => !prev)}
              style={{
                width: '100%', borderRadius: 8, padding: '10px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: '0.5px solid',
                background: isSubstitute ? '#FFF4E5' : 'white',
                borderColor: isSubstitute ? '#F0A500' : '#ddd',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: isSubstitute ? '#A05A00' : '#888' }}>
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
                  background:  breaks[key] ? '#E6F1FB' : 'white',
                  borderColor: breaks[key] ? '#1855A0' : '#ddd',
                }}
              >
                {breaks[key] && <i className="ti ti-check" style={{ position: 'absolute', top: 5, right: 5, fontSize: 11, color: '#1855A0' }} />}
                <span style={{ fontSize: 13, fontWeight: 500, display: 'block', color: breaks[key] ? '#1855A0' : '#888' }}>{label}</span>
                <span style={{ fontSize: 11, color: breaks[key] ? '#1855A0' : '#aaa' }}>{min}</span>
              </button>
            ))}
          </div>
          <div style={s.breakSummary}>
            取得合計：<span style={{ color: '#1855A0', fontWeight: 500 }}>{breakTotal}分</span>
            {breakLabel !== 'なし' && `（${breakLabel}）`}
          </div>
        </div>

        {/* メッセージ */}
        {message && (
          <div style={{
            margin: '0 16px 12px', padding: '8px 12px', fontSize: 13, borderRadius: 8,
            background: message.startsWith('エラー') ? '#FCEBEB' : '#E6F7EE',
            color:      message.startsWith('エラー') ? '#A32D2D' : '#1A7A4A',
          }}>
            {message}
          </div>
        )}

        <div style={{ height: 14 }} />
      </div>
    </div>
  );
}

function formatDateJp(dateStr) {
  const d    = new Date(dateStr + 'T00:00:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

const styles = {
  page: { minHeight: '100svh', background: '#f5f5f5', display: 'flex', justifyContent: 'center', padding: '1rem 1rem 80px' },
  card:           { background: 'white', border: '0.5px solid #eee', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden', alignSelf: 'flex-start' },
  topbar:         { background: '#f9f9f9', padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #eee' },
  empName:        { fontSize: 13, fontWeight: 500, color: '#222' },
  dateLabel:      { fontSize: 12, color: '#888' },
  logoutBtn:      { border: 'none', background: 'none', color: '#aaa', cursor: 'pointer', padding: 0 },
  timeArea:       { padding: '16px 16px 12px', textAlign: 'center' },
  timeBig:        { fontSize: 40, fontWeight: 500, color: '#222', letterSpacing: -1, marginBottom: 2 },
  timeSub:        { fontSize: 12, color: '#888', marginBottom: 14 },
  todayRow:       { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 },
  todayCell:      { background: '#f9f9f9', borderRadius: 8, padding: '7px 8px', textAlign: 'center' },
  todayCellLabel: { fontSize: 10, color: '#888', marginBottom: 2 },
  todayCellVal:   { fontSize: 14, fontWeight: 500 },
  punchRow:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 16px 4px' },
  punchBtn:       { borderRadius: 10, padding: '15px 0', textAlign: 'center', fontSize: 15, fontWeight: 500, cursor: 'pointer' },
  divider:        { height: '0.5px', background: '#eee', margin: '12px 16px 0' },
  section:        { padding: '12px 16px' },
  sectionLabel:   { fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 6 },
  selectWrap:     { border: '0.5px solid #eee', borderRadius: 8, padding: '9px 10px', background: '#f9f9f9', display: 'flex', alignItems: 'center' },
  breakGrid:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 4 },
  breakBtn:       { border: '0.5px solid', borderRadius: 8, padding: '10px 4px 8px', textAlign: 'center', cursor: 'pointer', position: 'relative' },
  breakSummary:   { fontSize: 12, color: '#888', textAlign: 'center', minHeight: 18 },
};