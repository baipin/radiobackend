'use client';
import { useEffect, useState } from 'react';

export default function RadioPage() {
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [meta, setMeta] = useState({ count: 0, lastUpdated: '' });
  const [loading, setLoading] = useState(true);

  // 1. 获取数据
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

  // 2. 前端搜索过滤逻辑
  useEffect(() => {
    const results = stations.filter(s =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStations(results);
  }, [searchTerm, stations]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">正在同步全量电台数据...</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
      {/* 头部区域 */}
      <div className="mb-8 sticky top-0 bg-white py-4 z-10 border-b">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">全国广播电台在线</h1>
        <p className="text-sm text-gray-500 mb-4">
          共收录 {meta.count} 个频道 | 更新于: {meta.lastUpdated}
        </p>
        
        {/* 搜索框 */}
        <input
          type="text"
          placeholder="输入电台名称，搜索全国电台..."
          className="w-full p-3 border-2 border-blue-100 rounded-xl focus:border-blue-500 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 列表区域 */}
      {filteredStations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStations.map((station) => (
            <a
              key={station.id || station.title}
              href={`/api/local?name=${encodeURIComponent(station.title)}`}
              target="_blank"
              rel="noreferrer"
              className="group p-4 bg-white hover:bg-blue-50 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <h3 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                  {station.title}
                </h3>
                <span className="text-xs text-gray-400 mt-1 block">ID: {station.id || 'N/A'}</span>
              </div>
              <div className="mt-4 flex items-center text-blue-500 text-sm font-medium">
                点击收听 
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          未找到包含 "{searchTerm}" 的电台
        </div>
      )}
    </div>
  );
}
