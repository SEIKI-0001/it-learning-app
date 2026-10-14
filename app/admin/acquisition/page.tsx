"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ACQUISITION_PERIODS,
  CHANNEL_LABELS,
  DEFAULT_ACQUISITION_PERIOD,
  NO_SOURCE,
  type AcquisitionPeriod,
  type AcquisitionReport,
  type Metrics,
  type XPostInfo,
} from "@/lib/growth/acquisition";

// 集客分析（proxy.ts の Basic 認証。API 側でも同じ認証を行う）。
// 数え方は lib/growth/acquisition.ts と scripts/acquisition/signup-sources.sql を参照。

type Loaded =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; report: AcquisitionReport; warnings: string[] };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  });
}

function rate(part: number, whole: number | null): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

function num(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("ja-JP");
}

const TH = "px-2 py-1.5 text-right font-medium whitespace-nowrap";
const TD = "px-2 py-1.5 text-right tabular-nums text-gray-700";

function MetricCells({ m }: { m: Metrics }) {
  return (
    <>
      <td className={TD}>{num(m.visits)}</td>
      <td className={TD}>{num(m.signups)}</td>
      <td className={TD}>
        {num(m.activated)}
        <span className="ml-1 text-gray-400">{rate(m.activated, m.signups)}</span>
      </td>
      <td className={TD}>
        {num(m.returned)}
        <span className="ml-1 text-gray-400">{rate(m.returned, m.signups)}</span>
      </td>
    </>
  );
}

function MetricHeads() {
  return (
    <>
      <th className={TH}>訪問</th>
      <th className={TH}>登録</th>
      <th className={TH}>学習開始</th>
      <th className={TH}>再学習</th>
    </>
  );
}

function PostCell({ content, post }: { content: string | null; post: XPostInfo | null }) {
  if (!content) return <>—</>;
  const label = post?.scheduledAt
    ? `${new Date(post.scheduledAt).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}${post.theme ? `・${post.theme}` : ""}`
    : content.slice(0, 10);
  return post?.postUrl ? (
    <a href={post.postUrl} target="_blank" rel="noreferrer" title={content} className="text-brand-600 underline">
      {label}
    </a>
  ) : (
    <span title={content} className="font-mono">
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-gray-400">{children}</p>;
}

export default function AcquisitionAdminPage() {
  const [days, setDays] = useState<AcquisitionPeriod>(DEFAULT_ACQUISITION_PERIOD);
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/acquisition?days=${days}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          report?: AcquisitionReport;
          warnings?: string[];
          error?: string;
        };
        if (!res.ok || !data.ok || !data.report) throw new Error(data.error ?? `HTTP ${res.status}`);
        return { report: data.report, warnings: data.warnings ?? [] };
      })
      .then(({ report, warnings }) => {
        if (!cancelled) setLoaded({ status: "ok", report, warnings });
      })
      .catch((e: Error) => {
        if (!cancelled) setLoaded({ status: "error", message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [days, reloadKey]);

  const retry = useCallback(() => {
    setLoaded({ status: "loading" });
    setReloadKey((k) => k + 1);
  }, []);
  const choosePeriod = (p: AcquisitionPeriod) => {
    if (p === days) return;
    setLoaded({ status: "loading" });
    setDays(p);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md md:max-w-5xl">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">集客分析</h1>
          <Link href="/admin" className="text-sm font-medium text-brand-500">
            管理ビューへ →
          </Link>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          流入元ごとの訪問・登録・学習開始（1問以上回答）・再学習（別の日にも回答）。
        </p>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="期間" className="flex rounded-lg bg-white p-1 shadow-sm">
            {ACQUISITION_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => choosePeriod(p)}
                aria-pressed={days === p}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  days === p ? "bg-gray-800 text-white" : "text-gray-600"
                }`}
              >
                {p}日
              </button>
            ))}
          </div>
          <a
            href={`/api/admin/acquisition?days=${days}&format=csv`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700"
          >
            CSVを書き出す
          </a>
        </div>

        {loaded.status === "loading" && (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
            集計を取得中…
          </div>
        )}

        {loaded.status === "error" && (
          <div className="rounded-xl bg-amber-50 p-5 text-sm text-amber-800 shadow-sm">
            集計を取得できませんでした（{loaded.message}）。
            <button type="button" onClick={retry} className="ml-2 font-bold underline">
              再読み込み
            </button>
          </div>
        )}

        {loaded.status === "ok" && <Report report={loaded.report} warnings={loaded.warnings} />}
      </div>
    </main>
  );
}

function Report({ report, warnings }: { report: AcquisitionReport; warnings: string[] }) {
  const t = report.totals;
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        {formatDate(report.period.startAt)}〜{formatDate(report.period.endAt)}（JST）に登録したアカウント
        {report.excluded.users + report.excluded.visitors > 0 && (
          <>
            ・除外 {report.excluded.users} アカウント／{report.excluded.visitors} 端末
          </>
        )}
      </p>

      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[
          { label: "訪問（公開ページ）", value: num(t.visits), sub: "外部から入った端末数" },
          { label: "登録", value: num(t.signups), sub: `訪問比 ${rate(t.signups, t.visits)}（参考）` },
          { label: "学習開始", value: num(t.activated), sub: `登録の ${rate(t.activated, t.signups)}` },
          { label: "再学習", value: num(t.returned), sub: `登録の ${rate(t.returned, t.signups)}` },
        ].map((c) => (
          <div key={c.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-800">{c.value}</p>
            <p className="mt-0.5 text-xs text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700">チャネル比較</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="px-2 py-1.5 text-left font-medium">チャネル</th>
                <MetricHeads />
                <th className={TH}>登録/訪問</th>
              </tr>
            </thead>
            <tbody>
              {report.channels.map((c) => (
                <tr key={c.channel} className="border-b border-gray-50">
                  <td className="px-2 py-1.5 text-left font-medium text-gray-700">{c.label}</td>
                  <MetricCells m={c} />
                  <td className={`${TD} text-gray-400`}>{rate(c.signups, c.visits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          訪問は公開ページ（過去問・解説・ガイド・単語・LP）の閲覧を端末単位で数えた値で、アカウントとは結びつけていません。
          「登録/訪問」は別々に数えた2つの数の比で、同じ人を追った転換率ではありません。
        </p>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700">流入元・キャンペーン別</h2>
        {report.sources.length === 0 ? (
          <Empty>この期間の訪問・登録はありません。</Empty>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="px-2 py-1.5 text-left font-medium">流入元</th>
                  <th className="px-2 py-1.5 text-left font-medium">キャンペーン</th>
                  <MetricHeads />
                  <th className={TH}>β特典</th>
                </tr>
              </thead>
              <tbody>
                {report.sources.map((s) => (
                  <tr key={`${s.channel}|${s.source}|${s.campaign}`} className="border-b border-gray-50">
                    <td className="px-2 py-1.5 text-left text-gray-700">
                      {s.source === NO_SOURCE ? "記録なし" : s.source}
                      <span className="ml-1 text-gray-400">{CHANNEL_LABELS[s.channel]}</span>
                    </td>
                    <td className="px-2 py-1.5 text-left font-mono text-gray-600">{s.campaign ?? "—"}</td>
                    <MetricCells m={s} />
                    <td className={TD}>{num(s.betaGranted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700">キャンペーン・投稿別</h2>
        {report.posts.length === 0 ? (
          <Empty>
            この期間に utm_campaign 付きのリンクや X 自動投稿から来た訪問・登録はありません。X
            自動投稿（organic_x）は投稿 ID ごとに1行で並びます。
          </Empty>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="px-2 py-1.5 text-left font-medium">流入元 / 媒体</th>
                  <th className="px-2 py-1.5 text-left font-medium">キャンペーン</th>
                  <th className="px-2 py-1.5 text-left font-medium">投稿</th>
                  <MetricHeads />
                </tr>
              </thead>
              <tbody>
                {report.posts.map((p) => (
                  <tr
                    key={`${p.channel}|${p.source}|${p.medium}|${p.campaign}|${p.content}`}
                    className="border-b border-gray-50"
                  >
                    <td className="px-2 py-1.5 text-left text-gray-700">
                      {p.source}
                      {p.medium && <span className="text-gray-400"> / {p.medium}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-left font-mono text-gray-600">{p.campaign ?? "—"}</td>
                    <td className="px-2 py-1.5 text-left text-gray-600">
                      <PostCell content={p.content} post={p.post} />
                    </td>
                    <MetricCells m={p} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-gray-400">
        学習開始・再学習は登録したアカウントの回答記録を今日まで追った数です（期間の短い7日は再学習が少なく出ます）。
        テスト・運営アカウントは環境変数 ACQUISITION_EXCLUDED_USER_IDS、運営の端末は ACQUISITION_EXCLUDED_VISITOR_IDS
        で除外します。
      </p>
    </div>
  );
}
