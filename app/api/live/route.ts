import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ORIGINAL_URL = 'https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  // 如果没有传 name，则返回所有频道（保持原来行为）
  if (!name) {
    try {
      const res = await fetch(ORIGINAL_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 30 },
      });
      const json = await res.json();
      
      const channels = (json.data || []).map((item: any) => ({
        title: item.title,
        streamUrl: item.playUrlMulti || item.mp3PlayUrlHigh || item.mp3PlayUrlLow || item.playUrlLow,
      }));

      return NextResponse.json({
        success: true,
        count: channels.length,
        channels
      });
    } catch (e) {
      return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
    }
  }

  // ========== 重点：按名称查询时，直接返回直播链接字符串 ==========
  try {
    const res = await fetch(ORIGINAL_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 25 },
    });

    const json = await res.json();
    const channels = json.data || [];

    const channel = channels.find((item: any) => 
      item.title && item.title.includes(name)
    );

    if (!channel) {
      return new Response('未找到该频道', { status: 404 });
    }

    const streamUrl = channel.playUrlMulti || 
                     channel.mp3PlayUrlHigh || 
                     channel.mp3PlayUrlLow || 
                     channel.playUrlLow;

    if (!streamUrl) {
      return new Response('该频道暂无直播源', { status: 404 });
    }

    // 直接返回直播链接字符串（纯文本）
    return new Response(streamUrl, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=25',
      },
    });

  } catch (error) {
    console.error(error);
    return new Response('获取直播源失败', { status: 500 });
  }
}
