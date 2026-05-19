import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function PayslipPage() {
  const { user } = useAuth();
  const [files, setFiles]     = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadFiles(); }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await api.payslipList();
      setFiles(result);
    } catch (err) {
      console.log('給与明細取得エラー:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topbar}>
          <div style={s.topTitle}>給与明細</div>
          <span style={{ fontSize: 12, color: '#888' }}>{user?.name}</span>
        </div>

        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>
            読み込み中...
          </div>
        )}

        {!loading && files.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
            <i className="ti ti-file-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            給与明細はまだありません
          </div>
        )}

        {files.map(file => (
          <div key={file.fileId} style={{ padding: '12px 16px', borderBottom: '0.5px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-file-type-pdf" style={{ fontSize: 20, color: '#A32D2D' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{file.fileName}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{file.createdAt}</div>
            </div>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, padding: '6px 12px', borderRadius: 6, border: '0.5px solid #B5D4F4', background: '#E6F1FB', color: '#1855A0', textDecoration: 'none', flexShrink: 0 }}
            >
              ダウンロード
            </a>
          </div>
        ))}

        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}

const s = {
  page:     { minHeight: '100svh', background: '#f5f5f5', display: 'flex', justifyContent: 'center', padding: '1rem 1rem 80px' },
  card:     { background: 'white', border: '0.5px solid #eee', borderRadius: 16, width: '100%', maxWidth: 400, alignSelf: 'flex-start', overflow: 'hidden' },
  topbar:   { background: '#f9f9f9', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid #eee' },
  topTitle: { fontSize: 14, fontWeight: 500, color: '#222', flex: 1 },
};