'use client';
import { useEffect, useState } from 'react';

export default function RadioPage() {
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [meta, setMeta] = useState({ count: 0, lastUpdated: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/local') 
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setStations(json.stations || json.channels || []);
          setFilteredStations(json.stations || json.channels || []);
          setMeta({ count: json.count, lastUpdated: json.lastUpdated });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("加载失败:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const results = stations.filter(s =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStations(results);
  }, [searchTerm, stations]);

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>正在同步全量电台数据...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📻 全国广播电台在线</h1>
        <p style={styles.subtitle}>
          共收录 {meta.count} 个频道 | 更新于: {meta.lastUpdated}
        </p>
        
        <input
          type="text"
          placeholder="🔍 输入电台名称，搜索全国电台..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredStations.length > 0 ? (
        <div style={styles.grid}>
          {filteredStations.map((station, index) => (
            <a
              key={station.id || station.title || index}
              href={`/api/local?name=${encodeURIComponent(station.title)}`}
              target="_blank"
              rel="noreferrer"
              style={styles.card}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0,0,0,0.1)';
              }}
            >
              <div>
                <h3 style={styles.cardTitle}>{station.title}</h3>
                <span style={styles.cardId}>ID: {station.id || station.contentId || 'N/A'}</span>
              </div>
              <div style={styles.playButton}>
                点击收听 
                <span style={styles.playIcon}>▶</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          未找到包含 "{searchTerm}" 的电台
        </div>
      )}
    </div>
  );
}

// 样式定义
const styles = {
  container: {
    padding: '1rem',
    maxWidth: '1280px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
    minHeight: '100vh'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#6b7280'
  },
  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: '#f9fafb',
    padding: '1rem 0',
    borderBottom: '2px solid #e5e7eb',
    marginBottom: '2rem',
    zIndex: 10
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1rem'
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #d1d5db',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.75rem',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.5rem',
    fontSize: '1rem'
  },
  cardId: {
    fontSize: '0.75rem',
    color: '#9ca3af'
  },
  playButton: {
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    color: '#3b82f6',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  playIcon: {
    marginLeft: '0.25rem',
    fontSize: '0.75rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '5rem',
    color: '#9ca3af'
  }
};

// 添加动画
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
    }
  `;
  document.head.appendChild(styleSheet);
}
