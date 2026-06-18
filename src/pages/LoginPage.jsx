import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage({ onLogin }) {
  const { login } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const role = await login(employeeId, password);
      onLogin(role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '1rem' }}>
      <div style={{ background: 'white', border: '0.5px solid #ddd', borderRadius: '16px', padding: '2rem 1.5rem', width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>勤怠管理システム</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>社員IDとパスワードでログイン</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>社員ID</label>
            <input type="text" value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="例: EMP001" required style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: '0.5px solid #ccc', fontSize: 14 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>パスワード</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="パスワードを入力" required style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: '0.5px solid #ccc', fontSize: 14 }} />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: '#A32D2D', background: '#FCEBEB', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 500, background: '#E6F1FB', color: '#185FA5', border: '1.5px solid #B5D4F4', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        <div style={{ marginTop: 16, borderTop: '0.5px solid #eee', paddingTop: 16 }}>
          <a href="https://aopen3024.github.io/aostock/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px', fontSize: 14, fontWeight: 500, background: '#FFF8E6', color: '#A07800', border: '1.5px solid #F0C030', borderRadius: 10, textDecoration: 'none', boxSizing: 'border-box' }}>
            🏭 ao<strong>STOCK</strong>へ
          </a>
        </div>
      </div>
    </div>
  );
}