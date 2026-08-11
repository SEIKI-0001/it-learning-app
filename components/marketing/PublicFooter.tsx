import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 px-5 py-8 text-center text-sm text-slate-600">
      <p>ITパスポート学習コーチ</p>
      <nav className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="法務情報">
        <Link href="/lp">サービス紹介</Link>
        <Link href="/legal/tokusho">特定商取引法に基づく表示</Link>
        <Link href="/privacy">プライバシーポリシー</Link>
      </nav>
    </footer>
  );
}
