import { NextResponse } from 'next/server';
import crypto from 'crypto';

const CITY_MAP = {
  china: 0, beijing: 110000, hebei: 130000, shanghai: 310000, chongqing: 500000,
  henan: 410000, jiangsu: 320000, guizhou: 520000, liaoning: 210000, sichuan: 510000,
  zhejiang: 330000, ningxia: 640000, fujian: 350000, gansu: 620000, guangdong: 440000,
  jiangxi: 360000, shandong: 370000, shanxi_1: 140000, hunan: 430000, hubei: 420000,
  hainan: 460000, jilin: 220000, heilongjiang: 230000, shanxi_2: 610000, neimenggu: 150000,
  guangxi: 450000, yunnan: 530000, anhui: 340000, qinghai: 630000, xinjiang: 650000,
  xizang: 540000, xinjiangbingtuan: 660000,
};

const HEADERS = {
  'Device-Number': '0000', 'Platform-Code': 'WEB', 'Device-Source': 'WEB',
  'Provider-Code': '320000', 'Version': '4.0.0',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU OS 16_1_1 like Mac OS X)'
};

// 获取单个城市电台的通用函数
async function getStationsByCity(cityCode) {
  const timestamp = Date.now() + "123";
  const url = `https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=${cityCode}`;
  const signStr = `categoryId=0&provinceCode=${cityCode}&timestamp=${timestamp}&key=f0fc4c668392f9f9a447e48584c214ee`;
  const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

  const res = await fetch(url, { headers: { ...HEADERS, sign, timestamp } });
  const json = await res.json();
  return json.data || [];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetName = searchParams.get('name');

  // 场景 A: 如果带了 name 参数，直接查找并 302 重定向
  if (targetName) {
    for (const code of Object.values(CITY_MAP)) {
      const stations = await getStationsByCity(code);
      const match = stations.find(s => s.title === targetName);
      if (match) return NextResponse.redirect(match.mp3PlayUrlHigh);
    }
    return NextResponse.json({ error: "未找到该电台" }, { status: 404 });
  }

  // 场景 B: 获取全量数据（用于前端页面展示）
  // 注意：由于城市较多，这里使用 Promise.all 并行请求提高速度
  const allCityRequests = Object.entries(CITY_MAP).map(async ([name, code]) => {
    const data = await getStationsByCity(code);
    return { cityName: name, stations: data };
  });

  const results = await Promise.all(allCityRequests);
  return NextResponse.json(results);
}
