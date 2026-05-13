'use client';
import { useEffect, useState } from 'react';

export default function RadioPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/radio')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-10">正在加载全量电台数据...</div>;

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">全国广播电台在线收听</h1>
      {data.map(city => (
        <div key={city.cityName} className="mb-8">
          <h2 className="text-xl font-semibold border-b-2 border-blue-500 pb-2 mb-4 capitalize">
            {city.cityName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {city.stations.map(station => (
              <a
                key={station.contentId}
                href={`/api/local?name=${encodeURIComponent(station.title)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-gray-100 hover:bg-blue-100 rounded-lg transition-colors border border-gray-200 block text-sm"
              >
                <div className="font-medium text-gray-800">{station.title}</div>
                <div className="text-xs text-gray-500 mt-1 text-blue-600">点击播放音频流 →</div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
