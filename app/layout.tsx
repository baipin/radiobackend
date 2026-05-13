import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Radio Backend API',
  description: '中国广播直播源动态代理',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
