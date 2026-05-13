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

    if (!name) {
      // ... 你的原有返回所有频道的逻辑不变
      const result = channels.map((item: any) => ({ ... }));
      return NextResponse.json({ success: true, channels: result }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // ==================== 带 name 参数：代理直播流 ====================
    const channel = channels.find((item: any) =>
      item.title?.includes(name.trim())
    );

    if (!channel) return NextResponse.json({ success: false, error: '未找到频道' }, { status: 404 });

    let streamUrl = channel.playUrlMulti || channel.mp3PlayUrlHigh || 
                   channel.mp3PlayUrlLow || channel.playUrlLow;

    if (!streamUrl) return NextResponse.json({ success: false, error: '无直播源' }, { status: 404 });

    // ====================== 关键修改：代理流 ======================
    const streamRes = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
        'Accept': '*/*',
      },
      // 保持长连接
    });

    if (!streamRes.ok) {
      return NextResponse.json({ success: false, error: '上游流不可用' }, { status: 502 });
    }

    // 构造响应
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Content-Type': 'audio/mpeg',           // MP3 用这个，AAC 可改成 audio/aac
      // 'Content-Type': 'application/vnd.apple.mpegurl', // 如果想强伪装 HLS
      'icy-name': channel.title || 'Radio Stream',   // Shoutcast/Icecast 元数据
      'icy-description': 'Proxy Stream',
    });

    // 如果想让 ExoPlayer 更认为它是 HLS，可以伪造路径（可选）
    // 但更重要的是返回正确的流内容

    return new NextResponse(streamRes.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
