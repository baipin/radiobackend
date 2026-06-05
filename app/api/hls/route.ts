import { NextRequest, NextResponse } from 'next/server';

// 强制指定使用 Node.js 运行时（App Router 的新版写法）
export const runtime = 'nodejs';

export default async function handler(req, res) {
  // 1. 从 URL 参数中动态获取用户传入的 aac 地址
  // 例如请求：https://xxx.vercel.app/api/proxy?url=http://example.com/live.aac
  const { url: aacUrl } = req.query;

  if (!aacUrl) {
    return res.status(400).json({ error: 'Missing "url" parameter' });
  }

  try {
    // 2. 动态发起对远端 AAC 的请求
    const response = await fetch(aacUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`无法获取目标流: ${response.statusText}`);
    }

    // 3. 伪装成一个分块传输的长连接音频
    res.writeHead(200, {
      'Content-Type': 'audio/aac',
      'Transfer-Encoding': 'chunked', // 🌟 核心：分块传输，欺骗系统网络层
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    const reader = response.body.getReader();

    // 4. 动态双向管道读写
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value); // 动态写入，有多少发多少
    }

  } catch (error) {
    console.error('动态转发失败:', error);
    if (!res.writableEnded) {
      res.end();
    }
  }
}
