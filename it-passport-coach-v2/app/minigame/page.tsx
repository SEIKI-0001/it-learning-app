import Link from "next/link";
import { DnsMiniGame } from "@/components/study/DnsMiniGame";

export default function MiniGamePage() {
  return (
    <main className="page page-narrow">
      <p className="eyebrow">ミニゲーム</p>
      <h1>手を動かしてDNSを理解する</h1>
      <p className="lead">
        MVPではDNSの名前解決を実装しています。難しいテーマだけに小さな体験を追加できる構造です。
      </p>
      <DnsMiniGame />
      <div className="section">
        <Link className="button button-secondary" href="/topics/technology-dns">
          DNSのテーマ解説へ
        </Link>
      </div>
    </main>
  );
}
