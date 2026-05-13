import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ORIGINAL_URL = 'https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0';

// 将 HTTP 转换为 HTTPS
function toHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

// 代理 M3U8 并重写内容
async function proxyM3U8(m3u8Url: string, requestUrl: URL): Promise<Response> {
  const httpsUrl = toHttps(m3u8Url);
  console.log(`[M3U8 Proxy] 获取: ${httpsUrl}`);
  
  // 获取 M3U8 内容
  const response = await fetch(httpsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': new URL(httpsUrl).origin,
    },
  });

  if (!response.ok) {
    throw new Error(`获取 M3U8 失败: ${response.status}`);
  }

  let content = await response.text();
  const lines = content.split('\n');
  
  // 获取 M3U8 的基础路径
  const m3u8BaseUrl = new URL(httpsUrl);
  const m3u8Path = m3u8BaseUrl.pathname.substring(0, m3u8BaseUrl.pathname.lastIndexOf('/') + 1);
  
  // 构建代理基础 URL（用于重写 TS 分片）
  const proxyBase = `${requestUrl.origin}${requestUrl.pathname}?ts=`;

  const rewrittenLines = lines.map(line => {
    const trimmedLine = line.trim();
    
    // 跳过注释行和空行
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return line;
    }
    
    // 跳过已经包含代理参数的
    if (trimmedLine.includes('?ts=')) {
      return line;
    }
    
    // 处理分片 URL
    let absoluteUrl: string;
    if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
      absoluteUrl = trimmedLine;
    } else if (trimmedLine.startsWith('/')) {
      absoluteUrl = `${m3u8BaseUrl.origin}${trimmedLine}`;
    } else {
      absoluteUrl = `${m3u8BaseUrl.origin}${m3u8Path}${trimmedLine}`;
    }
    
    // 转换为 HTTPS
    absoluteUrl = toHttps(absoluteUrl);
    
    // 返回代理后的地址
    return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
  });

  const rewrittenContent = rewrittenLines.join('\n');
  
  // 返回正确的 M3U8 响应头
  return new Response(rewrittenContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',  // 关键：M3U8 的 MIME 类型
      'Content-Disposition': 'inline',                  // 关键：让浏览器播放而不是下载
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Accept-Ranges': 'bytes',
    },
  });
}

// 代理 TS 分片
async function proxyTS(tsUrl: string): Promise<Response> {
  const httpsUrl = toHttps(tsUrl);
  console.log(`[TS Proxy] 代理: ${httpsUrl}`);
  
  const response = await fetch(httpsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': new URL(httpsUrl).origin,
    },
  });

  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Content-Type', 'video/MP2T');  // TS 分片的 MIME 类型

  return new Response(response.body, {
    status: response.status,
    headers: headers,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const tsUrl = searchParams.get('ts');  // 代理 TS 分片

  // ==================== 处理 TS 分片代理 ====================
  if (tsUrl) {
    try {
      return await proxyTS(tsUrl);
    } catch (error) {
      console.error('TS 代理失败:', error);
      return NextResponse.json({ error: '代理分片失败' }, { status: 502 });
    }
  }

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

    // ==================== 2. 带 name 参数：返回可播放的 M3U8 ====================
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
        // 返回代理后的 M3U8 内容（浏览器会播放而不是下载）
        return await proxyM3U8(streamUrl, new URL(request.url));
      } catch (error) {
        console.error('M3U8 代理失败，回退到重定向:', error);
        // 失败时回退到 HTTPS 重定向
        const httpsUrl = toHttps(streamUrl);
        return NextResponse.redirect(httpsUrl, {
          status: 302,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store',
          }
        });
      }
    } else {
      // 非 M3U8 格式（如 MP3），使用重定向
      const httpsUrl = toHttps(streamUrl);
      return NextResponse.redirect(httpsUrl, {
        status: 302,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store',
        }
      });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
