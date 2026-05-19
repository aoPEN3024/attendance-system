import React, { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import PunchPage from './pages/PunchPage'
import MyPage from './pages/MyPage'
import AdminPage from './pages/AdminPage'

function AppInner() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('punch')

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)' }}>読み込み中...</div>
  if (!user) return <LoginPage onLogin={() => {}} />
  if (user.role === 'admin') return <AdminPage />

  return (
    <div>
      {tab === 'punch' && <PunchPage />}
      {tab === 'mypage' && <MyPage />}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white',
        borderTop: '0.5px solid #ddd',
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0',
      }}>
        {[
          { key: 'punch', icon: 'ti-clock', label: '打刻' },
          { key: 'mypage', icon: 'ti-calendar', label: 'マイページ' },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, textAlign: 'center', fontSize: 10,
              border: 'none', background: 'none', cursor: 'pointer',
              color: tab === key ? '#1855A0' : '#888',
            }}
          >
            <i className={`ti ${icon}`} style={{ display: 'block', fontSize: 22, marginBottom: 2 }} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}