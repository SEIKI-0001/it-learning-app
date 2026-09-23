"use client";

// /progress の全体像: 合格までの道のり（CP0〜CP6 → 試験日）と主要指標4つ。
// 道の上の「いまここ」はモチット。位置は「最後に突破した CP から、次の CP までの区間を
// CP達成条件の集まり具合だけ進んだところ」。予定の位置は buildCheckpointComparison の
// 期待 CP を、その区間の中央に置く。

import Link from "next/link";
import Mochit from "@/components/mochit/Mochit";
import Icon from "@/components/ui/Icon";
import type { CheckpointDef } from "@/types/checkpoint";
import t from "@/components/today/todayView.module.css";
import p from "./progressDashboard.module.css";

export type OverviewKpis = {
  readiness: { score: number | null; bandLabel: string };
  exam: { daysLeft: number | null; dateLabel: string | null };
  pace: { label: string; note: string; tone: "good" | "neutral" | "warn" } | null;
  gate: { earned: number; required: number; checkpointOrder: number };
  proposalHref: string | null;
};

export default function ProgressOverview({
  dateLabel,
  checkpoints,
  clearedIds,
  currentId,
  gateRatio,
  expectedOrder,
  examDateLabel,
  kpis,
}: {
  dateLabel: string;
  checkpoints: CheckpointDef[];
  clearedIds: string[];
  currentId: string;
  /** 次の CP へ向かう区間の進み具合（0〜1）。 */
  gateRatio: number;
  /** 予定では向かっているはずの CP の order。分からなければ null。 */
  expectedOrder: number | null;
  examDateLabel: string | null;
  kpis: OverviewKpis;
}) {
  const columns = checkpoints.length + 1; // CP ＋ 試験日
  const position = (index: number, within = 0) => ((index + 0.5 + within) / columns) * 100;

  const current = checkpoints.find((cp) => cp.id === currentId) ?? checkpoints[0];
  const allCleared = checkpoints.every((cp) => clearedIds.includes(cp.id));
  // 現在の CP に向かう区間は「ひとつ前の CP」から始まる。CP0 のときは CP0 の上に立つ。
  const fromIndex = Math.max(0, current.order - 1);
  const segmentRatio = current.order === 0 ? 0 : Math.min(1, Math.max(0, gateRatio));
  const nowAt = allCleared ? position(checkpoints.length) : position(fromIndex, segmentRatio);
  const expectedAt =
    expectedOrder === null || allCleared
      ? null
      : position(Math.max(0, expectedOrder - 1), expectedOrder === 0 ? 0 : 0.5);
  const remaining = checkpoints.filter((cp) => !clearedIds.includes(cp.id)).length;

  return (
    <section className={p.overview} aria-labelledby="overview-heading">
      <p className={t.eyebrow}>
        <span className={t.eyebrowTitle}>進捗</span>
        <span className={t.eyebrowDate}>{dateLabel} 時点</span>
      </p>

      <div className={p.readinessFocus}>
        <div>
          <p className={p.readinessFocusLabel}>いちばん大切な指標 · 合格準備度</p>
          <p className={p.readinessFocusValue}>
            {kpis.readiness.score === null ? "測定中" : <>{kpis.readiness.score}<span>/100</span></>}
          </p>
          <p className={p.readinessFocusNote}>{kpis.readiness.bandLabel}</p>
        </div>
        <Link href="/today" className={p.readinessFocusLink}>今日の学習を進める →</Link>
      </div>

      <div className={p.overviewHead}>
        <h1 id="overview-heading" className={p.overviewTitle}>
          合格までの道のり
        </h1>
        <p className={p.overviewLead}>
          {allCleared ? (
            <>すべてのチェックポイントを突破しました。あとは試験本番です。</>
          ) : (
            <>
              いまは <strong>CP{current.order}「{current.title}」</strong> に向かう途中。残り
              <span className={t.mono}> {remaining} </span>
              つのチェックポイントを越えると、試験本番です。
            </>
          )}
        </p>
      </div>

      <div className={p.road}>
        <div className={p.roadLine} aria-hidden>
          {current.order > 1 && (
            <span
              className={p.roadDone}
              style={{ left: `${position(0)}%`, width: `${position(fromIndex) - position(0)}%` }}
            />
          )}
          {!allCleared && current.order > 0 && (
            <span
              className={p.roadNow}
              style={{ left: `${position(fromIndex)}%`, width: `${nowAt - position(fromIndex)}%` }}
            />
          )}
        </div>

        <div className={p.here} style={{ left: `${nowAt}%` }}>
          <Mochit size="xs" screenContext="progress" className={p.hereMochit} />
          <span className={p.hereLabel}>いまここ</span>
        </div>
        {expectedAt !== null && (
          <span className={p.expected} style={{ left: `${expectedAt}%` }}>
            予定
          </span>
        )}

        <ol className={p.roadStops}>
          {checkpoints.map((cp) => {
            const state = clearedIds.includes(cp.id)
              ? "done"
              : cp.id === currentId
                ? "goal"
                : "next";
            return (
              <li key={cp.id} className={p.stop} data-state={state}>
                <span className={p.stopDot} aria-hidden>
                  {state === "done" && (
                    <svg viewBox="0 0 20 20">
                      <path d="M5.5 10.5l3 3 6-7" />
                    </svg>
                  )}
                </span>
                <span className={p.stopCode}>CP{cp.order}</span>
                <span className={p.stopTitle}>{cp.title}</span>
              </li>
            );
          })}
          <li className={p.stop} data-state="exam">
            <span className={p.stopDot} aria-hidden>
              <Icon name="target" className={p.flag} />
            </span>
            <span className={p.stopCode}>試験</span>
            <span className={p.stopTitle}>{examDateLabel ?? "日程未設定"}</span>
          </li>
        </ol>
      </div>

      <dl className={p.kpis}>
        {kpis.exam.daysLeft === null ? (
          <Link href="/settings" className={`${p.kpi} ${p.kpiLink}`}>
            <dt>試験まで</dt>
            <dd className={p.kpiWord}>未設定</dd>
            <p className={p.kpiNote}>
              試験日を決める
              <Icon name="chevron-right" className={p.kpiChev} />
            </p>
          </Link>
        ) : (
          <div className={p.kpi}>
            <dt>試験まで</dt>
            <dd>
              <span className={p.kpiNum}>{kpis.exam.daysLeft}</span>
              <span className={p.kpiUnit}>日</span>
            </dd>
            <p className={p.kpiNote}>{kpis.exam.dateLabel}</p>
          </div>
        )}
        {kpis.proposalHref ? (
          <Link href={kpis.proposalHref} className={`${p.kpi} ${p.kpiLink}`}>
            <dt>学習ペース</dt>
            <dd className={p.kpiWord} data-tone={kpis.pace?.tone ?? "neutral"}>
              {kpis.pace?.label ?? "確認中"}
            </dd>
            <p className={p.kpiNote}>
              立て直し提案を見る
              <Icon name="chevron-right" className={p.kpiChev} />
            </p>
          </Link>
        ) : (
          <div className={p.kpi}>
            <dt>学習ペース</dt>
            <dd className={p.kpiWord} data-tone={kpis.pace?.tone ?? "neutral"}>
              {kpis.pace?.label ?? "確認中"}
            </dd>
            <p className={p.kpiNote}>{kpis.pace?.note ?? "学習を記録すると判定します"}</p>
          </div>
        )}
        <a href="#gate" className={`${p.kpi} ${p.kpiLink}`}>
          <dt>突破試験まで</dt>
          <dd>
            <span className={p.kpiNum}>{kpis.gate.earned}</span>
            <span className={p.kpiUnit}>/{kpis.gate.required} 条件</span>
          </dd>
          <p className={p.kpiNote}>
            CP{kpis.gate.checkpointOrder}の達成条件
            <Icon name="chevron-right" className={p.kpiChev} />
          </p>
        </a>
      </dl>
    </section>
  );
}
