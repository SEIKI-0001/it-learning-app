import type { Metadata } from "next";
import ComputerCoreExperience from "@/components/experiences/ComputerCoreExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

// テスト環境での確認用（feat/computer-3d-model 専用。main へ入れる前に消す）。
// テスト環境はログインすると本番ドメインへ戻されるため、ログイン不要の /lp 配下に
// 「CPU・メモリ・ストレージ」の体験をそのまま出して、動く3D模型を確認できるようにする。

export const metadata: Metadata = {
  title: "3D模型の確認（テスト用）",
  robots: { index: false, follow: false },
};

export default function Preview3DPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="text-sm font-bold text-brand-700">テスト環境・確認用</p>
          <h1 className="mt-2 text-2xl font-bold leading-snug">CPU・メモリ・ストレージ（動く3D模型）</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">「次へ」を1回押すと「② データの流れを追う」に3D模型が出ます。</p>
        </header>
        <ExperienceSlideDeck>
          <ComputerCoreExperience />
        </ExperienceSlideDeck>
      </div>
    </main>
  );
}
