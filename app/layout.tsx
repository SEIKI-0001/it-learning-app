import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';
import ScrollRestoration from '@/components/ScrollRestoration';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ITパスポート学習コーチ',
  description:
    'LINEで続ける、ITパスポート合格支援AI学習コーチ。試験日から逆算して、今日やるべき学習メニューと復習をやさしく案内します。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-gray-50">
        <Suspense fallback={null}>
          <ScrollRestoration />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
