// app/api/live/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ORIGINAL_URL = 'https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  try {
    const res = await fetch(ORIGINAL_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Radio-Proxy)' },
      next: { revalidate: 30 },
    });

    if (!res.ok) throw new Error('上游接口错误');

    const json = await res.json();
    const channels = json.data || [];

    // ==================== 1. 不带 name 参数：返回频道列表 ====================
    if (!name) {
      const result = channels.map((item: any) => ({
        title: item.title,
        subtitle: item.subtitle || '',
        image: item.image,
        contentId: item.contentId,
        streamUrl: item.playUrlMulti || item.mp3PlayUrlHigh || item.mp3PlayUrlLow || item.playUrlLow,
        allUrls: {
          playUrlMulti: item.playUrlMulti,
          mp3PlayUrlHigh: item.mp3PlayUrlHigh,
          mp3PlayUrlLow: item.mp3PlayUrlLow,
          playUrlLow: item.playUrlLow,
        }
      }));

      return NextResponse.json({
        success: true,
        count: result.length,
        channels: result,
        updatedAt: new Date().toISOString(),
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=30',
        }
      });
    }

    // ==================== 2. 带 name 参数：代理直播流（关键修复） ====================
    const channel = channels.find((item: any) =>
      item.title && item.title.includes(name.trim())
    );

    if (!channel) {
      return NextResponse.json({ success: false, error: '未找到该频道' }, { status: 404 });
    }

    let streamUrl = channel.playUrlMulti ||
                   channel.mp3PlayUrlHigh ||
                   channel.mp3PlayUrlLow ||
                   channel.playUrlLow;

    if (!streamUrl) {
      return NextResponse.json({ success: false, error: '该频道暂无直播源' }, { status: 404 });
    }

    // ==================== 代理真实流 ====================
    const streamRes = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S9110) AppleWebKit/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive',
      },
    });

    if (!streamRes.ok) {
      return NextResponse.json({ success: false, error: '上游流不可用' }, { status: 502 });
    }

    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': streamRes.headers.get('Content-Type') || 'audio/mpeg',
      'icy-name': channel.title || 'Live Radio',
      'icy-description': 'Proxy Stream',
      'icy-pub': '1',
    });

    return new NextResponse(streamRes.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 });
  }
}
