"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTopicById } from "@/lib/content";
import { BOOK_QUALITY_FAILURE_LABELS } from "@/lib/bookQuality";
import type { BookOrderDiagnosis } from "@/lib/bookOrderDiagnostics";

// 参考書順（Book mode）の Shadow 比較。管理者だけが見る（proxy.ts の Basic 認証）。
// ユーザーの画面は変えずに、「参考書順にしたら何が変わるか」を本番データで確かめる。

type Report = {
  ok: boolean;
  supabase: boolean;
  users: { user: string; title: string; active: boolean; preference: string | null; diagnosis: BookOrderDiagnosis }[];
  presets: { id: string; title: string; diagnosis: BookOrderDiagnosis }[];
};

const pct = (v: number | undefined) => (v === undefined ? "-" : `${Math.round(v * 100)}%`);
const title = (id: string) => getTopicById(id)?.title ?? id;

function DiagnosisCard({ heading, sub, d }: { heading: string; sub?: string; d: BookOrderDiagnosis }) {
  if (!d.ok) {
    return (
      <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
        <p className="font-bold">{heading}</p>
        <p>生成エラー: {d.error}</p>
      </div>
    );
  }
  const q = d.quality;
  return (
    <div className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold text-gray-800">{heading}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            q?.eligible ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {q?.eligible ? "参考書順に使える" : "品質不足"}
        </span>
      </div>
      {sub && <p className="mb-2 text-xs text-gray-400">{sub}</p>}
      {q && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-4">
          <dt className="text-gray-400">紐づけ</dt>
          <dd>
            {q.mappedCount}/{q.catalogSize}（{pct(q.mappedRatio)}）
          </dd>
          <dt className="text-gray-400">重要テーマ</dt>
          <dd>
            {q.importantMapped}/{q.importantTotal}（{pct(q.importantMappedRatio)}）
          </dd>
          <dt className="text-gray-400">補足</dt>
          <dd>
            {q.supplementCount}件（{pct(q.supplementRatio)}）
          </dd>
          <dt className="text-gray-400">分野</dt>
          <dd>
            T{q.mappedByField.technology} / M{q.mappedByField.management} / S{q.mappedByField.strategy}
          </dd>
          <dt className="text-gray-400">ユニット</dt>
          <dd>
            {d.units?.withTopics ?? 0}（読むだけ {d.units?.readingOnly ?? 0}）
          </dd>
          <dt className="text-gray-400">1ユニットの最大/平均</dt>
          <dd>
            {d.units?.maxTopicsPerUnit ?? 0} / {(d.units?.avgTopicsPerUnit ?? 0).toFixed(1)}
          </dd>
          <dt className="text-gray-400">不明ID</dt>
          <dd>{d.unknownTopicIds?.join(", ") || "なし"}</dd>
          <dt className="text-gray-400">完了 / 出題元</dt>
          <dd>
            {d.completedCount ?? 0} / {d.examPoolTopics ?? 0}
          </dd>
        </dl>
      )}
      {q && q.failures.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
          {q.failures.map((f) => (
            <li key={f}>{BOOK_QUALITY_FAILURE_LABELS[f]}</li>
          ))}
        </ul>
      )}
      {d.units && d.units.largest.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          大きいユニット: {d.units.largest.map((u) => `${u.label}（${u.topicCount}）`).join(" / ")}
        </p>
      )}
      {d.importantSupplements && d.importantSupplements.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          本に無い重要テーマ: {d.importantSupplements.map((t) => t.title).join("、")}
        </p>
      )}
      {d.currentUnitLabel !== undefined && (
        <p className="mt-2 text-xs">
          <span className="text-gray-400">参考書順の現在地: </span>
          {d.currentUnitLabel ?? "（全ユニット学習済み）"}
        </p>
      )}
      {(d.nextApp || d.nextBook) && (
        <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
          <div>
            <p className="font-bold text-gray-500">次の新規（いまのアプリ順）</p>
            <ol className="list-decimal pl-5">
              {(d.nextApp ?? []).map((id) => (
                <li key={id}>{title(id)}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="font-bold text-gray-500">
              次の新規（参考書順）{d.nextOverlap !== undefined && ` ・一致 ${d.nextOverlap}件`}
            </p>
            <ol className="list-decimal pl-5">
              {(d.nextBook ?? []).map((id) => (
                <li key={id}>{title(id)}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookOrderReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/book-order", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: Report) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md md:max-w-5xl">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">参考書順の比較（Shadow）</h1>
          <Link href="/admin" className="text-sm font-medium text-brand-500">
            管理ビューへ
          </Link>
        </div>
        <p className="mb-6 text-xs text-gray-400">
          ユーザーの画面は変えず、参考書順にした場合の結果だけを計算しています（読み取りのみ）。
        </p>

        {failed && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">読み込めませんでした。</p>}
        {!report && !failed && <p className="text-sm text-gray-400">読み込み中…</p>}

        {report && (
          <>
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-bold text-gray-700">
                登録中の参考書（{report.users.length}人）
              </h2>
              {!report.supabase && <p className="text-xs text-gray-400">Supabase 未設定</p>}
              <div className="space-y-3">
                {report.users.map((u) => (
                  <DiagnosisCard
                    key={u.user}
                    heading={u.title || "（書名なし）"}
                    sub={`user ${u.user}… ・${u.active ? "使用中" : "未使用"} ・希望: ${u.preference ?? "未設定（アプリ順）"}`}
                    d={u.diagnosis}
                  />
                ))}
              </div>
            </section>
            <section>
              <h2 className="mb-3 text-sm font-bold text-gray-700">同梱プリセット（{report.presets.length}冊）</h2>
              <div className="space-y-3">
                {report.presets.map((p) => (
                  <DiagnosisCard key={p.id} heading={p.title} sub={p.id} d={p.diagnosis} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
