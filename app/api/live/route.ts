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

    // ==================== 1. 不带 name 参数：返回所有频道完整信息 ====================
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

    // ==================== 2. 带 name 参数：直接 302 跳转到直播流 ====================
    const channel = channels.find((item: any) => 
      item.title && item.title.includes(name.trim())
    );

    if (!channel) {
      return NextResponse.json({ success: false, error: '未找到该频道' }, { status: 404 });
    }

    const streamUrl = channel.playUrlMulti || 
                     channel.mp3PlayUrlHigh || 
                     channel.mp3PlayUrlLow || 
                     channel.playUrlLow;

    if (!streamUrl) {
      return NextResponse.json({ success: false, error: '该频道暂无直播源' }, { status: 404 });
    }

    // 直接跳转（推荐用于播放）
    return NextResponse.redirect(streamUrl, {
      status: 302,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30',
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
