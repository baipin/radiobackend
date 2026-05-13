import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ORIGINAL_URL = 'https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0';

// 获取 M3U8 内容并重写分片路径
async function rewriteM3U8Content(m3u8Url: string, requestUrl: URL): Promise<string> {
  const response = await fetch(m3u8Url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Radio-Proxy)' },
  });

  if (!response.ok) {
    throw new Error(`获取 M3U8 失败: ${response.status}`);
  }

  let content = await response.text();
  const lines = content.split('\n');
  const m3u8BaseUrl = new URL(m3u8Url);
  const m3u8Path = m3u8BaseUrl.pathname.substring(0, m3u8BaseUrl.pathname.lastIndexOf('/') + 1);

  // 构建代理基础 URL（当前 API 的地址）
  const proxyBase = `${requestUrl.origin}/api/live`;

  const rewrittenLines = lines.map(line => {
    const trimmedLine = line.trim();
    
    // 跳过注释行和空行
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return line;
    }
    
    // 已经是完整 URL 的，通过代理包装
    if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
      return `${proxyBase}?proxy=${encodeURIComponent(trimmedLine)}`;
    }
    
    // 相对根路径
    if (trimmedLine.startsWith('/')) {
      const absoluteUrl = `${m3u8BaseUrl.origin}${trimmedLine}`;
      return `${proxyBase}?proxy=${encodeURIComponent(absoluteUrl)}`;
    }
    
    // 相对当前路径
    const absoluteUrl = `${m3u8BaseUrl.origin}${m3u8Path}${trimmedLine}`;
    return `${proxyBase}?proxy=${encodeURIComponent(absoluteUrl)}`;
  });

  return rewrittenLines.join('\n');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const proxyUrl = searchParams.get('proxy'); // 用于代理 TS 分片

  // ==================== 处理 TS 分片代理 ====================
  if (proxyUrl) {
    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': new URL(proxyUrl).origin,
        },
      });

      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Content-Type', 'video/MP2T');

      return new Response(response.body, {
        status: response.status,
        headers: headers,
      });
    } catch (error) {
      return NextResponse.json({ success: false, error: '代理 TS 分片失败' }, { status: 502 });
    }
  }

  try {
    const res = await fetch(ORIGINAL_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Radio-Proxy)' },
      cache: 'no-store',
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
          'Cache-Control': 'no-cache, no-store',
        }
      });
    }

    // ==================== 2. 带 name 参数：返回重写后的 M3U8 ====================
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

    // 判断是否是 M3U8 文件
    const isM3U8 = streamUrl.includes('.m3u8');

    if (isM3U8) {
      try {
        // 获取 M3U8 内容并重写分片路径
        const rewrittenContent = await rewriteM3U8Content(streamUrl, new URL(request.url));
        
        // 返回重写后的 M3U8，并设置正确的 Content-Type
        return new Response(rewrittenContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store',
          },
        });
      } catch (error) {
        console.error('M3U8 重写失败:', error);
        // 如果重写失败，回退到 302 重定向
        return NextResponse.redirect(streamUrl, {
          status: 302,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store',
          }
        });
      }
    }

    // 非 M3U8 格式，直接 302 重定向
    return NextResponse.redirect(streamUrl, {
      status: 302,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store',
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
