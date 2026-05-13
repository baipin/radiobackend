import type { Metadata, Viewport } from 'next';
import './globals.css';

// 1. 设置元数据：对 SEO 和书签更友好
export const metadata: Metadata = {
  title: '全国广播电台直播 - 在线收听',
  description: '免费提供全国各地广播电台直播源，支持一键收听，高音质动态更新。',
  keywords: '广播直播, 蜻蜓FM, 云听, 电台直播源, M3U8, 在线收听',
};

// 2. 移动端优化：防止页面缩放，提升点击体验
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      {/* 
        3. 在 body 添加 antialiased 让字体更平滑 
        min-h-screen 确保背景色铺满全屏
      */}
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {/* 如果需要全局页眉，可以放在这里 */}
        <main>
          {children}
        </main>
        
        {/* 全局页脚（可选） */}
        <footer className="py-8 text-center text-gray-400 text-sm border-t border-gray-100 mt-12">
          <p>© {new Date().getFullYear()} Radio API Service</p>
          <p className="mt-1">数据来源自公共网络资源</p>
        </footer>
      </body>
    </html>
  );
}
