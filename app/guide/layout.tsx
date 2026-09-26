import type { ReactNode } from "react";
import "./guide.css";

// 公開ガイド（未ログインで閲覧可。lib/auth/publicRoutes の PUBLIC_PREFIXES に登録）。
// 読み物として軽く保つため、ヘッダー・フッターとも JS を使わない。

export default function GuideLayout({ children }: { children: ReactNode }) {
  return (
    <div className="guide">
      <header className="g-top">
        <div className="g-col g-top-in">
          <a className="g-logo" href="/lp">
            ITパスポート学習コーチ
          </a>
          <a className="g-top-link" href="/guide">
            学習ガイド
          </a>
        </div>
      </header>
      <main className="g-main">{children}</main>
      <footer className="g-foot">
        <div className="g-col">
          <a href="/lp">ITパスポート学習コーチ</a>
          {" / "}
          <a href="/guide">ITパスポート学習ガイド</a>
          <br />
          <a href="/legal/tokusho">特定商取引法に基づく表示</a>
          {" / "}
          <a href="/privacy">プライバシーポリシー</a>
        </div>
      </footer>
    </div>
  );
}
