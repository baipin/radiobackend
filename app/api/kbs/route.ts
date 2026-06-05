import { NextResponse } from 'next/server';

export async function GET() {
  // KBS 直播源官方 API
  const url = "http://world.kbs.co.kr/ipod/radio/getAudioPlaylist.php?lang=c&onair=true";

  try {
    // 1. 发起请求获取原始数据
    const response = await fetch(url);
    if (!response.ok) {
      return new NextResponse('Failed to fetch KBS playlist', { status: 500 });
    }

    // 2. 解析 JSON 拿到官方播放地址
    const result_array = await response.json();
    const play_url = result_array["playurl"];

    if (!play_url) {
      return new NextResponse('Play URL not found in response', { status: 502 });
    }

    // 3. 直接 302 重定向到官方直播源
    return NextResponse.redirect(play_url, 302);

  } catch (error) {
    console.error('Error fetching KBS stream:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
