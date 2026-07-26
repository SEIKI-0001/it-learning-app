import type { Metadata, Viewport } from 'next';
import './globals.css';
import CelebrationHost from '@/components/celebration/CelebrationHost';
import FloatingMochitGate from '@/components/mochit/FloatingMochitGate';

export const metadata: Metadata = {
  title: 'ITパスポート学習コーチ',
  description:
    'LINEで続ける、ITパスポート合格支援AI学習コーチ。試験日から逆算して、今日やるべき学習メニューと復習をやさしく案内します。',
};

// viewportFit: 'cover' でセーフエリア(env(safe-area-inset-*))を有効化し、
// 下部固定ナビが iPhone のホームバーと重ならないようにする。
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0868c9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="antialiased">
      {/* 背景色は globals.css の --background(#f6f8fb) に一元化する */}
      <body className="min-h-screen">
        {children}
        <FloatingMochitGate />
        <CelebrationHost />
      </body>
    </html>
  );
}
