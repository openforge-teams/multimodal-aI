import type { Metadata } from 'next';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc-provider';

export const metadata: Metadata = {
  title: 'DreamForge - 多模态 AI 创作平台',
  description: '类即梦的多模态 AI 创作平台，支持文生图、图生图、文生视频、图生视频、智能画布',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
