import Link from 'next/link';
import { ph } from '../ph';

// 切り口別LP（/lp/15min・/lp/retry）の共通部品。見た目は /lp と同じ lp.css に乗せ、
// 追加分だけ angle.css（.lp スコープ・ag- 接頭辞）に置く。
// どちらも検証用のため noindex。/lp 本体・サイトマップからはリンクしない。

export const START_HREF = '/login';
export const TRY_HREF = '/lp/try';

export function Check() {
  return (
    <svg className="ck" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function AngleHeader() {
  return (
    <header className="top">
      <div className="col top-in">
        <a className="logo" href="/lp">
          ITパスポート学習コーチ
        </a>
        <a className="btn small ag-top-cta" href={START_HREF}>
          無料で始める
        </a>
      </div>
    </header>
  );
}

export function AngleFooter() {
  return (
    <footer>
      <div className="col foot-in">
        <div className="foot-brand">
          <p className="logo">ITパスポート学習コーチ</p>
          <p>さわって理解する、ITパスポート試験の学習アプリ。</p>
        </div>
        <nav className="foot-nav" aria-label="サービス">
          <p className="foot-h">サービス</p>
          <a href="/lp">サービス紹介</a>
          <a href={START_HREF}>ログイン / 無料登録</a>
          <a href="/legal/tokusho">{ph('特定商取引法に|基づく表示')}</a>
          <a href="/privacy">プライバシーポリシー</a>
        </nav>
        <nav className="foot-nav" aria-label="無料で読める解説">
          <p className="foot-h">無料で読める解説</p>
          <a href="/guide">ITパスポート学習ガイド</a>
          <Link href="/kakomon">過去問解説</Link>
        </nav>
      </div>
    </footer>
  );
}
