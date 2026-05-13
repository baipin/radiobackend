import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CITY_MAP = {
  china: 0, beijing: 110000, hebei: 130000, shanghai: 310000, chongqing: 500000,
  henan: 410000, jiangsu: 320000, guizhou: 520000, liaoning: 210000, sichuan: 510000,
  zhejiang: 330000, ningxia: 640000, fujian: 350000, gansu: 620000, guangdong: 440000,
  jiangxi: 360000, shandong: 370000, shanxi_1: 140000, hunan: 430000, hubei: 420000,
  hainan: 460000, jilin: 220000, heilongjiang: 230000, shanxi_2: 610000, neimenggu: 150000,
  guangxi: 450000, yunnan: 530000, anhui: 340000, qinghai: 630000, xinjiang: 650000,
  xizang: 540000, xinjiangbingtuan: 660000,
};

// 抽取请求逻辑，加入缓存配置
async function fetchCityStations(cityCode) {
  const timestamp = Date.now() + "123";
  const url = `https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=${cityCode}`;
  const signStr = `categoryId=0&provinceCode=${cityCode}&timestamp=${timestamp}&key=f0fc4c668392f9f9a447e48584c214ee`;
  const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU OS 16_1_1 like Mac OS X)',
      'sign': sign,
      'timestamp': timestamp
    },
    // 关键优化：学习第一个代码，增加缓存，避免频繁抓取远程接口
    next: { revalidate: 3600 } 
  });
  
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetName = searchParams.get('name');

  try {
    // 关键优化：无论是否带 name，都并行请求所有城市数据
    // Promise.all 会同时发起所有请求，速度取决于最慢的那一个，而不是所有请求的总和
    const allDataPromises = Object.values(CITY_MAP).map(code => fetchCityStations(code));
    const allResults = await Promise.all(allDataPromises);
    
    // 将二维数组拍平为一维电台列表
    const allStations = allResults.flat();

    // 场景 A: 带了 name 参数，在内存中快速搜索
    if (targetName) {
      const match = allStations.find(s => s.title && s.title.includes(targetName.trim()));
      
      if (match) {
        const streamUrl = match.mp3PlayUrlHigh || match.playUrlMulti || match.mp3PlayUrlLow;
        return NextResponse.redirect(streamUrl, { status: 302 });
      }
      return NextResponse.json({ error: "未找到该电台" }, { status: 404 });
    }

    // 场景 B: 返回全量列表（可按城市分组输出，也可直接输出 flat 后的结果）
    return NextResponse.json({
      success: true,
      count: allStations.length,
      channels: allStations.map(s => ({ title: s.title, contentId: s.contentId }))
    });

  } catch (error) {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
