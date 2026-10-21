"use client";

import AuditMysteryExperience from "@/components/experiences/audit/AuditMysteryExperience";
import AuditStoryExperience from "@/components/experiences/audit/AuditStoryExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

// 本番（TopicContent）と同じく ExperienceSlideDeck で包み、1パネル＝1枚の横スワイプで見せる。
// 新旧の切替はページ遷移で行う（同じデッキの中で差し替えるとスライド数がずれるため）。
export default function AuditMysteryPreview({ old }: { old: boolean }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-24 pt-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold text-slate-500">確認用（テスト環境のみ）</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">システム監査の解説：謎解き版</h1>
        <nav className="mt-3 flex gap-1.5 text-xs">
          <a href="/lp/preview-audit-mystery" className={`rounded-full px-3 py-1.5 font-bold ${old ? "bg-white text-slate-700 ring-1 ring-slate-200" : "bg-slate-900 text-white"}`}>
            新：謎解き版
          </a>
          <a href="/lp/preview-audit-mystery?v=old" className={`rounded-full px-3 py-1.5 font-bold ${old ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
            旧：いまの本番（ストーリー版）
          </a>
        </nav>
        <div className="mt-4">
          <ExperienceSlideDeck>{old ? <AuditStoryExperience /> : <AuditMysteryExperience />}</ExperienceSlideDeck>
        </div>
      </div>
    </main>
  );
}
