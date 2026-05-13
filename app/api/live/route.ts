// app/api/live/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ORIGINAL_URL = 'https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  try {
    // ==================== 获取频道列表 ====================
    const listRes = await fetch(ORIGINAL_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; Radio-Proxy)',
        'Accept': 'application/json'
      },
      next: { revalidate: 30 },
    });

    if (!listRes.ok) {
      throw new Error(`上游列表接口错误: ${listRes.status}`);
    }

    const json = await listRes.json();
    const channels = json?.data || [];

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
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ==================== 查找频道并代理流 ====================
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

    // ==================== 关键：代理直播流 ====================
    const streamRes = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S9110) AppleWebKit/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'Icy-MetaData': '1',
      },
    });

    if (!streamRes.ok) {
      console.error(`上游流返回 ${streamRes.status}`);
      return NextResponse.json({ 
        success: false, 
        error: `上游流不可用 (${streamRes.status})` 
      }, { status: 502 });
    }

    // 构造响应头
    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': streamRes.headers.get('Content-Type') || 'audio/mpeg',
      'icy-name': channel.title || 'Live Radio',
      'icy-description': 'Proxy Stream',
      'icy-pub': '1',
      'icy-br': '128',
    });

    // 返回流（兼容 Vercel）
    return new NextResponse(streamRes.body, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('【Proxy 500 Error】:', error.message || error);
    console.error('Stack:', error.stack);

    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
