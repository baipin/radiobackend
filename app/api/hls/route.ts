// app/api/hls/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get('url');

  if (!sourceUrl) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }

  const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:8
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT
#EXT-X-ALLOW-CACHE:NO
#EXTINF:8.0,
${sourceUrl}
#EXT-X-ENDLIST`;

  return new NextResponse(m3u8Content, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
