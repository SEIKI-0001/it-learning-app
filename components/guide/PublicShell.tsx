import type { ReactNode } from "react";

// 公開ページ（/guide・/kakomon・/words）の共通の外枠。未ログインで閲覧可
// （lib/auth/publicRoutes の PUBLIC_PREFIXES に登録）。読み物として軽く保つため JS を使わない。
// スタイルは app/guide/guide.css（.guide スコープ）。各 layout がその CSS を読み込む。

const NAV = [
  { href: "/guide", label: "学習ガイド" },
  { href: "/kakomon", label: "過去問解説" },
  { href: "/words", label: "英略語" },
] as const;

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="guide">
      <header className="g-top">
        <div className="g-col g-top-in">
          <a className="g-logo" href="/lp">
            ITパスポート学習コーチ
          </a>
          <nav className="g-top-nav" aria-label="公開コンテンツ">
            {NAV.map((item) => (
              <a key={item.href} className="g-top-link" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="g-main">{children}</main>
      <footer className="g-foot">
        <div className="g-col">
          <a href="/lp">ITパスポート学習コーチ</a>
          {NAV.map((item) => (
            <span key={item.href}>
              {" / "}
              <a href={item.href}>{item.label}</a>
            </span>
          ))}
          <br />
          <a href="/legal/tokusho">特定商取引法に基づく表示</a>
          {" / "}
          <a href="/privacy">プライバシーポリシー</a>
        </div>
      </footer>
    </div>
  );
}
