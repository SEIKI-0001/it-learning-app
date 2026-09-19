"use client";

// 「いまの目標」＝向かっている CP の突破条件。道のりの直下に置き、残りの条件（やること）を
// 取り組み先つきで先頭に出す。判定は lib/checkpoints の buildCheckpointGate をそのまま使う。

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { badgeActionHref } from "@/components/badges/BadgeList";
import type { BadgeDef, CheckpointGate } from "@/types/checkpoint";
import t from "@/components/today/todayView.module.css";
import p from "./progressDashboard.module.css";

export default function ProgressGateCard({
  gate,
  earnedBadges,
  conditionMetIds,
  nextCheckpointTitle,
  className,
}: {
  gate: CheckpointGate;
  /** 獲得済みの必須バッジ。 */
  earnedBadges: BadgeDef[];
  /** まだ付与されていないが、条件はすでに満たしている必須バッジの id。 */
  conditionMetIds: Set<string>;
  nextCheckpointTitle: string | null;
  className?: string;
}) {
  const cp = gate.checkpoint;
  const needed = Math.max(gate.requiredBadgeCount, 1);
  const remainingCount = Math.max(0, gate.requiredBadgeCount - gate.earnedRequiredCount);
  const finalHref = `/checkpoint/${cp.id}/final`;
  const segments = Array.from({ length: needed }, (_, i) => i < gate.earnedRequiredCount);

  return (
    <section
      id="gate"
      className={`${p.card} ${className ?? ""}`}
      aria-labelledby="gate-heading"
    >
      <div className={p.gateHead}>
        <span className={p.gateTag}>いまの目標</span>
        <span className={p.gateCp}>
          CP{cp.order}「{cp.title}」の突破
        </span>
        <span className={p.gateCount}>
          <span className={`${t.mono} ${p.mono}`}>{Math.min(gate.earnedRequiredCount, needed)}</span>/
          {gate.requiredBadgeCount}
        </span>
      </div>

      <h2 id="gate-heading" className={p.gateTitle}>
        {gate.finalExamPassed ? (
          <>突破試験に合格しました</>
        ) : gate.finalExamUnlocked ? (
          <>必須バッジがそろいました。突破試験に挑戦できます</>
        ) : (
          <>
            あと<span className={p.gateNum}>{remainingCount}</span>
            つそろえば、突破試験に挑戦できます
          </>
        )}
      </h2>

      <div className={p.gateBar} aria-hidden style={{ gridTemplateColumns: `repeat(${needed}, minmax(0, 1fr))` }}>
        {segments.map((earned, i) => (
          <span key={i} data-earned={earned} />
        ))}
      </div>

      {gate.finalExamUnlocked && !gate.finalExamPassed ? (
        <ol className={p.todo}>
          <li className={p.todoItem}>
            <span className={p.todoMark} aria-hidden />
            <div className={p.todoBody}>
              <p className={p.todoTitle}>{cp.title}の突破試験</p>
              {cp.finalExam && (
                <p className={p.todoSub}>
                  {cp.finalExam.questionCount}問中{cp.finalExam.passThreshold}問以上の正解で合格
                </p>
              )}
            </div>
            <Link href={finalHref} className={p.todoAction}>
              挑戦する
              <Icon name="chevron-right" className={p.chev} />
            </Link>
          </li>
        </ol>
      ) : (
        gate.missingBadges.length > 0 && (
          <ol className={p.todo}>
            {gate.missingBadges.map((badge) => {
              const met = conditionMetIds.has(badge.id);
              return (
                <li key={badge.id} className={p.todoItem}>
                  <span className={p.todoMark} aria-hidden />
                  <div className={p.todoBody}>
                    <p className={p.todoTitle}>{badge.label}</p>
                    <p className={p.todoSub}>
                      {met ? "条件は満たしています。次の学習のあとに獲得します" : badge.conditionLabel}
                    </p>
                  </div>
                  <Link href={badgeActionHref(badge)} className={p.todoAction}>
                    取り組む
                    <Icon name="chevron-right" className={p.chev} />
                  </Link>
                </li>
              );
            })}
          </ol>
        )
      )}

      {earnedBadges.length > 0 && (
        <div className={p.gateDone}>
          <span className={p.gateDoneLabel}>獲得済み</span>
          {earnedBadges.map((badge) => (
            <span key={badge.id} className={p.gateDoneItem}>
              <svg viewBox="0 0 20 20" aria-hidden>
                <path d="M5.5 10.5l3 3 6-7" />
              </svg>
              {badge.label}
            </span>
          ))}
        </div>
      )}

      <p className={p.gateNote}>
        {nextCheckpointTitle
          ? `突破試験に合格すると、CP${cp.order + 1}「${nextCheckpointTitle}」へ進みます。`
          : "突破試験に合格すると、すべてのチェックポイントを突破します。"}
        <Link href="/plan" className={p.textLink}>
          ロードマップ
          <Icon name="chevron-right" className={p.chev} />
        </Link>
      </p>
    </section>
  );
}
