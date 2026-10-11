import type { Metadata } from "next";
import NetworkDevicesExperience from "@/components/experiences/NetworkDevicesExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

// テスト環境での確認用（feat/network-devices-blender 専用。main へ入れる前に消す）。
// テスト環境はログインすると本番ドメインへ戻されるため、ログイン不要の /lp 配下に
// 「ネットワーク機器の役割」の体験をそのまま出して、動く3D模型を確認できるようにする。

export const metadata: Metadata = {
  title: "3D模型の確認（テスト用）",
  robots: { index: false, follow: false },
};

export default function PreviewNetDev3DPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="text-sm font-bold text-brand-700">テスト環境・確認用</p>
          <h1 className="mt-2 text-2xl font-bold leading-snug">ネットワーク機器の役割（動く3D模型）</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">「次へ」を1回押すと「② 会社のフロアで、機器の仕事を見る」に3D模型が出ます。</p>
        </header>
        <ExperienceSlideDeck>
          <NetworkDevicesExperience />
        </ExperienceSlideDeck>
      </div>
    </main>
  );
}
