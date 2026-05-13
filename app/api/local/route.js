import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// --- 服务器端全局内存缓存 ---
// 注意：在开发环境（npm run dev）下，由于热更新，变量可能会重置；
// 在生产环境（npm run build）中，只要进程不关闭，它就会一直驻留。
let globalCache = {
  data: [],
  lastUpdated: 0,
  isFetching: false
};

const CACHE_TTL = 3600 * 1000; // 1小时（毫秒）

const CITY_MAP = {
  china: 0, beijing: 110000, hebei: 130000, shanghai: 310000, chongqing: 500000,
  henan: 410000, jiangsu: 320000, guizhou: 520000, liaoning: 210000, sichuan: 510000,
  zhejiang: 330000, ningxia: 640000, fujian: 350000, gansu: 620000, guangdong: 440000,
  jiangxi: 360000, shandong: 370000, shanxi_1: 140000, hunan: 430000, hubei: 420000,
  hainan: 460000, jilin: 220000, heilongjiang: 230000, shanxi_2: 610000, neimenggu: 150000,
  guangxi: 450000, yunnan: 530000, anhui: 340000, qinghai: 630000, xinjiang: 650000,
  xizang: 540000, xinjiangbingtuan: 660000,
};

// 抓取单个城市
async function fetchCity(code) {
  const timestamp = Date.now() + "123";
  const url = `https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=${code}`;
  const signStr = `categoryId=0&provinceCode=${code}&timestamp=${timestamp}&key=f0fc4c668392f9f9a447e48584c214ee`;
  const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

  try {
    const res = await fetch(url, {
      headers: { 'sign': sign, 'timestamp': timestamp, 'User-Agent': 'Mozilla/5.0' },
      // 开启 Next.js 的 fetch 级别缓存作为备份
      next: { revalidate: 3600 } 
    });
    const json = await res.json();
    return json.data || [];
  } catch (e) { return []; }
}

// 核心：全量数据更新逻辑
async function updateCache() {
  if (globalCache.isFetching) return;
  globalCache.isFetching = true;
  
  console.log(`[Radio API] 开始执行 1 小时定时更新任务... 时间: ${new Date().toLocaleString()}`);
  
  try {
    const all = await Promise.all(Object.values(CITY_MAP).map(code => fetchCity(code)));
    globalCache.data = all.flat();
    globalCache.lastUpdated = Date.now();
    console.log(`[Radio API] 更新成功，共加载 ${globalCache.data.length} 个电台`);
  } catch (err) {
    console.error(`[Radio API] 更新失败:`, err);
  } finally {
    globalCache.isFetching = false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  // --- 自动化缓存维护策略 ---
  const now = Date.now();
  const timeSinceLastUpdate = now - globalCache.lastUpdated;

  if (globalCache.data.length === 0) {
    // 情况1：服务器刚启动，数据为空，用户需要等待这一次抓取（仅限第一个人）
    await updateCache();
  } else if (timeSinceLastUpdate > CACHE_TTL) {
    // 情况2：数据已过期（1h）。
    // 关键点：不使用 await！立即后台更新，给当前用户先返回“旧数据”，这样用户完全不用等。
    updateCache(); 
  }

  // 从内存读取数据
  const allStations = globalCache.data;

  // 场景 A: 指定电台 302 重定向
  if (name) {
    const match = allStations.find(s => s.title?.includes(name.trim()));
    if (match) {
        const streamUrl = match.mp3PlayUrlHigh || match.playUrlMulti || match.mp3PlayUrlLow;
        return NextResponse.redirect(streamUrl, { status: 302 });
    }
    return NextResponse.json({ error: "未找到电台" }, { status: 404 });
  }

  // 场景 B: 返回全量列表
  return NextResponse.json({
    success: true,
    count: allStations.length,
    lastUpdated: new Date(globalCache.lastUpdated).toLocaleString(),
    stations: allStations.map(s => ({ title: s.title, id: s.contentId }))
  }, {
    headers: {
        // 让浏览器也缓存结果，减少对你服务器的请求
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
    }
  });
}
