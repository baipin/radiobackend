// app/api/hls/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { url: string[] } }
) {
  // 拼接用户传入的完整 URL
  const encodedUrl = params.url.join('/');
  let sourceUrl = decodeURIComponent(encodedUrl);

  // 如果用户只传了路径，自动补全协议（可选）
  if (!sourceUrl.startsWith('http')) {
    sourceUrl = 'https://' + sourceUrl;
  }

  console.log('收到伪HLS请求，源地址:', sourceUrl);

  // 生成伪 HLS m3u8
  const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT
#EXT-X-ALLOW-CACHE:NO
#EXTINF:10.0,
${sourceUrl}
#EXT-X-ENDLIST`;

  return new NextResponse(m3u8Content, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// 处理 OPTIONS 请求（CORS）
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
