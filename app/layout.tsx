import type { Metadata, Viewport } from 'next';
import './globals.css';
import { appFontVariables } from '@/lib/fonts';
import CelebrationHost from '@/components/celebration/CelebrationHost';
import FloatingMochitGate from '@/components/mochit/FloatingMochitGate';
import AttributionCapture from '@/components/growth/AttributionCapture';
import FirstRunFunnel from '@/components/growth/FirstRunFunnel';
import ThemeSync from '@/components/theme/ThemeSync';
import { themeBootScript } from '@/lib/theme';

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
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme は描画前のスクリプトが付けるので、サーバーの HTML とずれる警告は抑える
    <html lang="ja" className={`antialiased ${appFontVariables}`} suppressHydrationWarning>
      <head>
        {/* 配色テーマ（lib/theme）を最初の描画前に決める。後からの切り替えは ThemeSync */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript() }} />
      </head>
      {/* 背景色は globals.css の --background に一元化する（テーマで変わる） */}
      <body className="min-h-screen">
        <ThemeSync />
        {children}
        <FloatingMochitGate />
        <CelebrationHost />
        <AttributionCapture />
        <FirstRunFunnel />
      </body>
    </html>
  );
}
