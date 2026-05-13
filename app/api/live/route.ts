import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ORIGINAL_URL = 'https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  // 如果没有 name 参数，返回所有频道（JSON格式，保持兼容）
  if (!name) {
    return NextResponse.json({ 
      success: true, 
      message: "请使用 ?name=频道名称 参数获取单个直播源" 
    });
  }

  try {
    const res = await fetch(ORIGINAL_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Radio-Proxy)' },
      next: { revalidate: 25 },
    });

    if (!res.ok) throw new Error('上游接口错误');

    const json = await res.json();
    const channels = json.data || [];

    // 查找匹配的频道（模糊匹配）
    const channel = channels.find((item: any) => 
      item.title && item.title.includes(name.trim())
    );

    if (!channel) {
      return NextResponse.json({ success: false, error: '未找到该频道' }, { status: 404 });
    }

    // 获取最佳直播源
    const streamUrl = channel.playUrlMulti || 
                     channel.mp3PlayUrlHigh || 
                     channel.mp3PlayUrlLow || 
                     channel.playUrlLow;

    if (!streamUrl) {
      return NextResponse.json({ success: false, error: '该频道暂无直播源' }, { status: 404 });
    }

    // ============== 关键：直接跳转到真实直播地址 ==============
    return NextResponse.redirect(streamUrl, {
      status: 302,                    // 临时重定向
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30',
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      success: false, 
      error: '获取直播源失败' 
    }, { status: 500 });
  }
}
