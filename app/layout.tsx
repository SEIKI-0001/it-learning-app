import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import UnlockNoticeHost from '@/components/avatar/UnlockNoticeHost';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

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
  themeColor: '#4f46e5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-gray-50">
        {children}
        <UnlockNoticeHost />
      </body>
    </html>
  );
}
