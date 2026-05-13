import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SOURCE_URL = 'https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');     // 支持按名称搜索单个频道

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Radio-API/1.0)',
      },
      next: { revalidate: 25 },   // 直播源有时效，建议不要缓存太久
    });

    if (!response.ok) {
      throw new Error(`上游请求失败: ${response.status}`);
    }

    const json = await response.json();
    let data = json.data || [];

    // 支持按频道名称模糊搜索
    if (name) {
      const keyword = name.trim();
      data = data.filter((item: any) => 
        item.title && item.title.includes(keyword)
      );
    }

    // 处理返回数据
    const channels = data.map((item: any) => ({
      title: item.title,
      subtitle: item.subtitle || '',
      image: item.image,
      contentId: item.contentId,
      streamUrl: item.playUrlMulti || 
                 item.mp3PlayUrlHigh || 
                 item.mp3PlayUrlLow || 
                 item.playUrlLow,
      allUrls: {
        playUrlMulti: item.playUrlMulti,
        mp3High: item.mp3PlayUrlHigh,
        mp3Low: item.mp3PlayUrlLow,
      }
    }));

    return NextResponse.json({
      success: true,
      count: channels.length,
      channels,
      updatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=25, stale-while-revalidate=60',
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: '获取直播源失败，请稍后重试',
    }, { status: 500 });
  }
}
