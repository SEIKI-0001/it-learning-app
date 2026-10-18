"use client";

import type { AppState } from "@/types";
import Mochit from "@/components/mochit/Mochit";
import Icon from "@/components/ui/Icon";
import {
  getMochitFieldGrowth,
  getMochitGrowthLook,
  getMochitPersonality,
  MOCHIT_FIELD_LABELS,
  MOCHIT_GROWTH_STAGE_CHANGES,
  MOCHIT_GROWTH_STAGE_LABELS,
  MOCHIT_GROWTH_STAGES,
  MOCHIT_PERSONALITY_LABELS,
  nextMochitGrowthStageInfo,
} from "@/lib/mochit";
import { getMochitAlbum, type MochitAlbumEntry } from "@/lib/mochitMilestones";

const BAR_POSITION = ["左", "まん中", "右"] as const;
/** アルバムで先に見せる未到達の節目の数（残りは畳む）。 */
const VISIBLE_UPCOMING = 2;

function formatReachedAt(at: string | null): string {
  if (at === null) return "以前から";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/** /avatar の「モチットの成長」。学習から導いた見た目と、節目の記録を並べる。 */
export default function MochitGrowthPanel({
  state,
  displayName,
  level,
  rankName,
  titleLabel,
}: {
  state: AppState;
  displayName: string;
  level: number;
  rankName: string;
  titleLabel: string | null;
}) {
  const look = getMochitGrowthLook(state);
  const fields = getMochitFieldGrowth(state);
  const personality = getMochitPersonality(fields);
  const next = nextMochitGrowthStageInfo(state);
  const album = getMochitAlbum(state);
  const reached = album
    .filter((entry): entry is MochitAlbumEntry & { reachedAt: string | null } => entry.reachedAt !== undefined)
    .sort((a, b) => (a.reachedAt ?? "").localeCompare(b.reachedAt ?? ""));
  const upcoming = album.filter((entry) => entry.reachedAt === undefined);

  return (
    <>
      <section id="growth" className="rounded-xl bg-brand-50 p-5">
        <div className="flex flex-col items-center text-center">
          <Mochit state="normal" size="large" animation="idle" growthLook={look} />
          <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">{displayName} Lv.{level}</p>
          <p className="mt-1 text-sm font-semibold text-brand-700">モチットランク：{rankName}</p>
          <p className="mt-1 text-sm text-gray-700">装備中の称号：{titleLabel ?? "なし"}</p>
        </div>

        <ol className="mt-5 grid grid-cols-5 gap-1" aria-label="成長の段階">
          {MOCHIT_GROWTH_STAGES.map((stage) => {
            const done = stage <= look.stage;
            const current = stage === look.stage;
            return (
              <li key={stage} className="flex flex-col items-center gap-1" aria-current={current ? "step" : undefined}>
                <span
                  className={`h-1.5 w-full rounded-full ${done ? "bg-brand-600" : "bg-gray-300"}`}
                  aria-hidden="true"
                />
                <span className={`text-[11px] leading-tight ${current ? "font-bold text-brand-700" : done ? "text-gray-700" : "text-gray-400"}`}>
                  {MOCHIT_GROWTH_STAGE_LABELS[stage]}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-gray-800">
          いまは「{MOCHIT_GROWTH_STAGE_LABELS[look.stage]}」。{MOCHIT_GROWTH_STAGE_CHANGES[look.stage]}。
        </p>
        <p className="mt-1 text-xs text-gray-600">
          {next ? `次の「${MOCHIT_GROWTH_STAGE_LABELS[next.stage]}」は${next.conditionLabel}で、${MOCHIT_GROWTH_STAGE_CHANGES[next.stage]}。` : "すべての段階に届きました。"}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">胸のコア＝分野ごとの育ち</h2>
        <p className="mt-1 text-sm text-gray-600">
          コアの3本のバーは、左からストラテジ・マネジメント・テクノロジ。その分野の習熟度が上がるほど長く明るくなります。
        </p>
        <ul className="mt-4 space-y-3">
          {fields.map((field, index) => (
            <li key={field.field}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-gray-900">
                  {MOCHIT_FIELD_LABELS[field.field]}
                  <span className="ml-1 text-xs font-normal text-gray-500">（{BAR_POSITION[index]}のバー）</span>
                </span>
                <span className="tabular-nums text-xs text-gray-600">
                  Lv.{field.level} · 平均習熟度 {field.average}
                </span>
              </div>
              <div
                className="mt-1 grid grid-cols-4 gap-1"
                role="meter"
                aria-label={`${MOCHIT_FIELD_LABELS[field.field]}の育ち`}
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={field.level}
              >
                {[1, 2, 3, 4].map((step) => (
                  <span key={step} className={`h-2 rounded-full ${field.level >= step ? "bg-brand-600" : "bg-gray-200"}`} />
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                学び始めたトピック {field.startedTopics} / {field.totalTopics}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          個性：<span className="font-semibold text-gray-900">{MOCHIT_PERSONALITY_LABELS[personality]}</span>
          <span className="mt-1 block text-xs text-gray-600">
            {personality === "undecided"
              ? "どれかの分野の平均習熟度が20に届くと、得意分野に合わせて回路と花の色が決まります。"
              : personality === "balanced"
                ? "どの分野も同じくらい育っています。回路は元の色のまま。"
                : `${MOCHIT_FIELD_LABELS[personality]}がいちばん育っているので、回路と花がその色になります。`}
          </span>
        </p>
        <p className="mt-3 text-xs text-gray-500">見た目だけの変化で、合格準備度やチェックポイントの判定には影響しません。</p>
      </section>

      <section id="album" className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">成長アルバム</h2>
        <p className="mt-1 text-sm text-gray-600">{displayName}が育った日の記録です。</p>
        {reached.length > 0 ? (
          <ol className="mt-4 space-y-0">
            {reached.map(({ def, reachedAt }, index) => (
              <li key={def.id} className="relative flex gap-3 pb-4 last:pb-0">
                {index < reached.length - 1 && (
                  <span className="absolute left-[11px] top-6 h-full w-0.5 bg-brand-200" aria-hidden="true" />
                )}
                <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Icon name="sprout" className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs tabular-nums text-gray-500">{formatReachedAt(reachedAt)}</p>
                  <p className="text-sm font-semibold text-gray-900">{def.title}</p>
                  <p className="text-xs text-gray-600">{def.description}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-gray-500">まだ記録はありません。最初のトピックを学ぶと、コアのバーがともります。</p>
        )}

        {upcoming.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-900">これからの節目</h3>
            <ul className="mt-2 space-y-2">
              {upcoming.slice(0, VISIBLE_UPCOMING).map(({ def }) => (
                <UpcomingItem key={def.id} title={def.title} description={def.description} />
              ))}
            </ul>
            {upcoming.length > VISIBLE_UPCOMING && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-brand-700">ほかの節目も見る（{upcoming.length - VISIBLE_UPCOMING}件）</summary>
                <ul className="mt-2 space-y-2">
                  {upcoming.slice(VISIBLE_UPCOMING).map(({ def }) => (
                    <UpcomingItem key={def.id} title={def.title} description={def.description} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function UpcomingItem({ title, description }: { title: string; description: string }) {
  return (
    <li className="flex gap-3 rounded-lg bg-gray-50 p-2.5">
      <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-sm text-gray-700">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </li>
  );
}
