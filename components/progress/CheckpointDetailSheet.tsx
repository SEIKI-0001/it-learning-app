"use client";

// /progress の CP 詳細。道のりの CP を押すとその場で開く（スマホ=下から / 720px 以上=右から）。
// 中身は lib/checkpointDetail の buildCheckpointDetail をそのまま映すだけで、判定はしない。
// ここは「現在地と条件を確かめる」場所なので、学習を始める導線は現在の CP に1つだけ置く。

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  STAGE_LABELS,
  type CheckpointCondition,
  type CheckpointDetail,
} from "@/lib/checkpointDetail";
import Icon, { type IconName } from "@/components/ui/Icon";
import t from "@/components/today/todayView.module.css";
import s from "./checkpointDetail.module.css";

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function ConditionMark({ condition }: { condition: Pick<CheckpointCondition, "met" | "locked"> }) {
  const name: IconName = condition.met ? "check" : condition.locked ? "lock" : "circle";
  return (
    <span className={s.mark} data-met={condition.met} data-locked={condition.locked} aria-hidden>
      <Icon name={name} className={s.markIcon} />
    </span>
  );
}

export default function CheckpointDetailSheet({
  detail,
  onClose,
  onPrev,
  onNext,
}: {
  detail: CheckpointDetail;
  onClose: () => void;
  /** 前後の CP へ切り替える。端では null。 */
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { checkpoint: cp, stage, gate, currentCheckpoint: current } = detail;
  const headingId = `cp-detail-${cp.id}`;

  // 開いたら閉じるボタンへフォーカスし、閉じたら開いた要素へ戻す。背面はスクロールさせない。
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      // フォーカスをシートの中に閉じ込める。
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const showConditions = stage !== "cleared";
  const requiredBadges = detail.requiredBadges;
  const needed = Math.max(gate.requiredBadgeCount, 1);

  return (
    <div className={s.backdrop} onMouseDown={onClose} data-testid="cp-detail-backdrop">
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={s.panel}
        data-stage={stage}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={s.grip} aria-hidden />
        <header className={s.head}>
          <div className={s.headText}>
            <p className={s.eyebrow}>
              <span className={`${t.mono} ${s.code}`}>CP{cp.order}</span>
              <span className={s.pill} data-stage={stage}>
                {STAGE_LABELS[stage]}
              </span>
            </p>
            <h2 id={headingId} className={s.title}>
              {cp.title}
            </h2>
            <p className={s.summary}>{cp.summary}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={s.close}
            onClick={onClose}
            aria-label="詳細を閉じる"
          >
            <Icon name="x" className={s.closeIcon} />
          </button>
        </header>

        <div className={s.body}>
          {/* ── 位置づけ ── */}
          {stage === "cleared" && (
            <div className={s.notice} data-tone="done">
              <p className={s.noticeMain}>
                {cp.finalExam ? "このチェックポイントを突破しました" : "初回設定を完了しました"}
              </p>
              {detail.passedAttempt ? (
                <p className={s.noticeSub}>
                  {dateLabel(detail.passedAttempt.attemptedAt)}に突破試験に合格 ·{" "}
                  <span className={t.mono}>
                    {detail.passedAttempt.correct}/{detail.passedAttempt.total}
                  </span>
                  問正解
                </p>
              ) : (
                cp.finalExam && (
                  <p className={s.noticeSub}>
                    これまでの学習の記録から、突破済みとして扱っています。
                  </p>
                )
              )}
            </div>
          )}
          {stage === "next" && (
            <div className={s.notice} data-tone="calm">
              <p className={s.noticeMain}>現在はまだ取り組む必要はありません。</p>
              <p className={s.noticeSub}>
                CP{current.order}「{current.title}」を突破すると、このチェックポイントが学習対象になります。
              </p>
            </div>
          )}
          {stage === "locked" && (
            <div className={s.notice} data-tone="calm">
              <p className={s.noticeMain}>まだ解放されていません。</p>
              {detail.unlockAfter && (
                <p className={s.noticeSub}>
                  解放条件：CP{detail.unlockAfter.order}「{detail.unlockAfter.title}」を突破
                </p>
              )}
            </div>
          )}

          {/* ── 現在の CP：集まり具合と、あと必要なこと ── */}
          {stage === "current" && gate.requiredBadgeCount > 0 && (
            <div className={s.meter}>
              <p className={s.meterLabel}>
                CP達成条件
                <span>
                  <span className={`${t.mono} ${s.meterNum}`}>
                    {Math.min(gate.earnedRequiredCount, gate.requiredBadgeCount)}
                  </span>
                  /{gate.requiredBadgeCount}
                </span>
              </p>
              <div
                className={s.meterBar}
                aria-hidden
                style={{ gridTemplateColumns: `repeat(${needed}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: needed }, (_, i) => (
                  <span key={i} data-earned={i < gate.earnedRequiredCount} />
                ))}
              </div>
            </div>
          )}
          {stage === "current" && detail.remaining.length > 0 && (
            <section className={s.block} aria-labelledby={`${headingId}-todo`}>
              <h3 id={`${headingId}-todo`} className={s.blockTitle}>
                あと必要なこと
              </h3>
              <ul className={s.todo}>
                {detail.remaining.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          {/* ── 完了条件 ── */}
          {showConditions && (
            <section className={s.block} aria-labelledby={`${headingId}-cond`}>
              <h3 id={`${headingId}-cond`} className={s.blockTitle}>
                {stage === "current" ? "完了条件" : "このチェックポイントの完了条件"}
              </h3>
              <ul className={s.conditions}>
                {detail.conditions.map((c) => (
                  <li key={c.id} className={s.condition} data-met={c.met} data-locked={c.locked}>
                    <ConditionMark condition={c} />
                    <div className={s.conditionBody}>
                      <p className={s.conditionLabel}>
                        {c.label}
                        {c.count && (
                          <span className={`${t.mono} ${s.conditionCount}`}>
                            {c.count.current} / {c.count.required}
                          </span>
                        )}
                      </p>
                      {c.detail && !c.met && <p className={s.conditionDetail}>{c.detail}</p>}
                      {c.id === "badges" && requiredBadges.length > 0 && (
                        <ul className={s.badges}>
                          {requiredBadges.map((b) => (
                            <li key={b.def.id} className={s.badge} data-met={b.earned}>
                              <ConditionMark condition={{ met: b.earned, locked: false }} />
                              <div className={s.conditionBody}>
                                <p className={s.badgeLabel}>{b.def.label}</p>
                                <p className={s.conditionDetail}>
                                  {b.earned
                                    ? stage === "current"
                                      ? "達成"
                                      : "すでに達成しています"
                                    : b.conditionMet
                                      ? "条件は満たしています。次の学習のあとに反映されます"
                                      : b.def.conditionLabel}
                                </p>
                                {stage === "current" &&
                                  b.gaps.map((gap) => (
                                    <p key={gap} className={s.gap}>
                                      {gap}
                                    </p>
                                  ))}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── 突破済み：集めた条件 ── */}
          {stage === "cleared" && requiredBadges.length > 0 && (
            <section className={s.block} aria-labelledby={`${headingId}-won`}>
              <h3 id={`${headingId}-won`} className={s.blockTitle}>
                集めたCP達成条件
              </h3>
              <ul className={s.conditions}>
                {requiredBadges.map((b) => (
                  <li key={b.def.id} className={s.condition} data-met={b.earned}>
                    <ConditionMark condition={{ met: b.earned, locked: false }} />
                    <div className={s.conditionBody}>
                      <p className={s.badgeLabel}>{b.def.label}</p>
                      <p className={s.conditionDetail}>
                        {b.earned && b.earnedAt ? `${dateLabel(b.earnedAt)}に達成` : b.def.conditionLabel}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {detail.extraEarnedCount > 0 && (
                <p className={s.extra}>ほかにバッジを {detail.extraEarnedCount} 個獲得しています。</p>
              )}
            </section>
          )}

          {/* ── 現在の CP だけ、次の一歩を1つ ── */}
          {stage === "current" && cp.finalExam && (
            <Link
              href={gate.finalExamUnlocked && !gate.finalExamPassed ? `/checkpoint/${cp.id}/final` : "/today"}
              className={s.action}
            >
              {gate.finalExamUnlocked && !gate.finalExamPassed ? "突破試験に挑戦する" : "今日の学習で進める"}
              <Icon name="chevron-right" className={s.chev} />
            </Link>
          )}
        </div>

        <nav className={s.pager} aria-label="チェックポイントの切り替え">
          <button type="button" onClick={onPrev ?? undefined} disabled={!onPrev} className={s.pagerBtn}>
            <Icon name="chevron-left" className={s.chev} />
            前のCP
          </button>
          <button type="button" onClick={onNext ?? undefined} disabled={!onNext} className={s.pagerBtn}>
            次のCP
            <Icon name="chevron-right" className={s.chev} />
          </button>
        </nav>
      </section>
    </div>
  );
}
