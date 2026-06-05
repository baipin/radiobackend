import { NextRequest, NextResponse } from 'next/server';

// 1. 正确的运行时声明
export const runtime = 'nodejs';

// 2. 正确的导出名称：必须大写 GET，且不能使用 export default
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const aacUrl = searchParams.get('url');

  if (!aacUrl) {
    return NextResponse.json({ error: 'Missing "url" parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(aacUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    if (!response.ok) {
      return new NextResponse(`无法获取目标流: ${response.statusText}`, { status: response.status });
    }

    const remoteStream = response.body;
    if (!remoteStream) {
      return new NextResponse('无法读取目标流的 Body', { status: 502 });
    }

    const reader = remoteStream.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        reader.cancel();
      }
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'audio/aac',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('动态转发失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
