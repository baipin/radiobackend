export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4">📡 Radio API</h1>
        <p className="text-xl text-zinc-400 mb-10">中国广播直播源动态代理</p>
        
        <div className="bg-zinc-900 p-8 rounded-2xl text-left font-mono text-sm">
          <p className="mb-4">全部频道（央广）：</p>
          <a href="/api/live" target="_blank" className="text-blue-400 hover:underline block mb-2">
            → /api/live
          </a>
          <p className="mb-4">全部频道（所有,raw）：</p>
          <a href="/api/local" target="_blank" className="text-blue-400 hover:underline block mb-2">
            → /api/local
          </a>
          <p className="mb-4">全部频道（所有,简单html）：</p>
          <a href="/local" target="_blank" className="text-blue-400 hover:underline block mb-2">
            → /local
          </a>
          <p className="mt-6 mb-2">单个频道示例：</p>
          <a href="/api/live?name=中国之声" target="_blank" className="text-blue-400 hover:underline block">
            → /api/live?name=中国之声
          </a>
        </div>

        <p className="mt-10 text-zinc-500 text-sm">
          直接调用此 API 即可获取最新直播源
        </p>
      </div>
    </div>
  );
}
