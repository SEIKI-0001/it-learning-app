"use client";

// /progress の簡潔版。4ブロックだけで組む:
//   1. 要約（合格準備度・分野別・試験日・ペース）
//   2. 道のり（CP の点列）＋いまの目標（残りの条件）
//   3. 指標タイル（押すとその下に詳細を開く）
//   4. くわしく見る（他画面への導線）
// 判定・数値はすべて既存のロジックから受け取り、ここでは並べ方だけを決める。

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { badgeActionHref } from "@/components/badges/BadgeList";
import { STAGE_LABELS } from "@/lib/checkpointDetail";
import type { CheckpointStage } from "@/lib/checkpoints";
import type { BadgeDef, CheckpointDef, CheckpointGate, CheckpointId } from "@/types/checkpoint";
import type { ExamReadinessResult } from "@/types/examReadiness";
import t from "@/components/today/todayView.module.css";
import c from "./progressCompact.module.css";

// ───────────────────────── 1. 要約 ─────────────────────────

export function SummaryCard({
  dateLabel,
  readiness,
  readinessNote,
  improvement,
  exam,
  pace,
  proposalHref,
  className,
}: {
  dateLabel: string;
  readiness: ExamReadinessResult | null;
  /** 判定前・判定中の一言、または判定済みの段階名。 */
  readinessNote: string;
  improvement: { label: string; href: string } | null;
  exam: { daysLeft: number | null; dateLabel: string | null };
  pace: { label: string; tone: "good" | "neutral" | "warn" } | null;
  proposalHref: string | null;
  className?: string;
}) {
  const score = readiness?.score ?? null;
  return (
    <section className={`${c.card} ${c.summary} ${className ?? ""}`} aria-labelledby="summary-heading">
      <div className={c.summaryMain} data-guide="progress-readiness">
        <p className={c.label}>
          <span id="summary-heading">合格準備度</span>
          <span className={c.date}>{dateLabel}</span>
        </p>
        {score === null ? (
          <p className={c.scorePending}>判定前</p>
        ) : (
          <p className={c.score}>
            <span className={t.mono}>{score}</span>
            <span className={c.scoreUnit}>/100</span>
          </p>
        )}
        <p className={c.scoreNote}>{readinessNote}</p>
      </div>

      {readiness && score !== null && (
        <ul className={c.fields} data-guide="progress-breakdown">
          {readiness.fields.map((field) => (
            <li key={field.fieldId} className={c.field}>
              <span className={c.fieldName}>{field.label}</span>
              <span className={c.bar} aria-hidden>
                <span style={{ width: `${field.score ?? 0}%` }} />
              </span>
              <span className={`${t.mono} ${c.fieldScore}`}>{field.score ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className={c.stats} data-guide="progress-kpis">
        <div className={c.stat}>
          <dt>試験まで</dt>
          <dd>
            {exam.daysLeft === null ? (
              <Link href="/settings" className={c.statLink}>
                日付を決める
              </Link>
            ) : (
              <>
                <span className={t.mono}>{exam.daysLeft}</span>
                <span className={c.statUnit}>日</span>
                {exam.dateLabel && <span className={c.statSub}>{exam.dateLabel}</span>}
              </>
            )}
          </dd>
        </div>
        <div className={c.stat}>
          <dt>ペース</dt>
          <dd className={c.statWord} data-tone={pace?.tone ?? "neutral"}>
            {proposalHref ? (
              <Link href={proposalHref} className={c.statLink}>
                {pace?.label ?? "確認中"}
                <Icon name="chevron-right" className={c.chev} />
              </Link>
            ) : (
              pace?.label ?? "確認中"
            )}
          </dd>
        </div>
      </dl>

      {improvement && (
        <Link href={improvement.href} className={c.improve}>
          <span className={c.improveLabel}>伸ばしどころ</span>
          <span className={c.improveText}>{improvement.label}</span>
          <Icon name="chevron-right" className={c.chev} />
        </Link>
      )}
    </section>
  );
}

// ───────────────────────── 2. 道のり＋いまの目標 ─────────────────────────

export function RoadCard({
  checkpoints,
  stages,
  current,
  gate,
  earnedBadges,
  conditionMetIds,
  examDateLabel,
  onSelectCheckpoint,
  className,
}: {
  checkpoints: CheckpointDef[];
  stages: Record<CheckpointId, CheckpointStage>;
  current: CheckpointDef;
  gate: CheckpointGate;
  earnedBadges: BadgeDef[];
  conditionMetIds: Set<string>;
  examDateLabel: string | null;
  onSelectCheckpoint: (id: CheckpointId) => void;
  className?: string;
}) {
  const needed = Math.max(gate.requiredBadgeCount, 1);
  const earned = Math.min(gate.earnedRequiredCount, needed);
  const allCleared = checkpoints.every((cp) => stages[cp.id] === "cleared");

  return (
    <section id="gate" className={`${c.card} ${className ?? ""}`} aria-labelledby="road-heading">
      <div className={c.head}>
        <p className={c.label}>いまの目標</p>
        {!allCleared && (
          <span className={c.headMeta}>
            突破まで <span className={t.mono}>{`${earned}/${gate.requiredBadgeCount}`}</span>
          </span>
        )}
      </div>
      <h2 id="road-heading" className={c.goal}>
        {allCleared ? (
          "すべてのCPを突破しました"
        ) : (
          <>
            <span className={c.goalCode}>CP{current.order}</span>
            {current.title}
          </>
        )}
      </h2>

      <ol className={c.road} data-guide="progress-road" style={{ gridTemplateColumns: `repeat(${checkpoints.length + 1}, minmax(0, 1fr))` }}>
        {checkpoints.map((cp) => {
          const stage = stages[cp.id];
          const state = stage === "cleared" ? "done" : stage === "current" ? "now" : "next";
          return (
            <li key={cp.id} className={c.stop} data-state={state}>
              <button
                type="button"
                className={c.stopButton}
                onClick={() => onSelectCheckpoint(cp.id)}
                aria-label={`CP${cp.order}「${cp.title}」（${STAGE_LABELS[stage]}）の完了条件を見る`}
                aria-haspopup="dialog"
              >
                <span className={c.dot} aria-hidden />
                <span className={c.stopCode}>CP{cp.order}</span>
              </button>
            </li>
          );
        })}
        <li className={c.stop} data-state="exam">
          <span className={c.stopButton}>
            <span className={c.dot} aria-hidden />
            <span className={c.stopCode}>{examDateLabel ?? "試験"}</span>
          </span>
        </li>
      </ol>

      {gate.finalExamUnlocked && !gate.finalExamPassed ? (
        <Link href={`/checkpoint/${current.id}/final`} className={c.challenge}>
          突破試験に挑戦する
          <Icon name="chevron-right" className={c.chev} />
        </Link>
      ) : (
        (earnedBadges.length > 0 || gate.missingBadges.length > 0) && (
          <ul className={c.todo}>
            {earnedBadges.map((badge) => (
              <li key={badge.id} className={c.todoRow} data-done>
                <span className={c.check} aria-hidden />
                <span className={c.todoTitle}>{badge.label}</span>
              </li>
            ))}
            {gate.missingBadges.map((badge) => (
              <li key={badge.id}>
                <Link href={badgeActionHref(badge)} className={c.todoRow}>
                  <span className={c.check} aria-hidden />
                  <span className={c.todoTitle}>{badge.label}</span>
                  <span className={c.todoSub}>
                    {conditionMetIds.has(badge.id) ? "次の学習のあとに反映" : badge.conditionLabel}
                  </span>
                  <Icon name="chevron-right" className={c.chev} />
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}

// ───────────────────────── 3. 指標タイル ─────────────────────────

export type MetricTile = {
  id: string;
  label: string;
  value: ReactNode;
  sub: ReactNode;
  /** タイル下部の小さな図（バー・点列など） */
  visual?: ReactNode;
  detail: ReactNode;
};

export function MetricTiles({ tiles, className }: { tiles: MetricTile[]; className?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = tiles.find((tile) => tile.id === openId) ?? null;
  return (
    <div className={`${c.tilesWrap} ${className ?? ""}`}>
      <div className={c.tiles} style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
        {tiles.map((tile) => {
          const selected = tile.id === openId;
          return (
            <button
              key={tile.id}
              type="button"
              className={c.tile}
              aria-expanded={selected}
              aria-controls="metric-detail"
              data-selected={selected || undefined}
              onClick={() => setOpenId(selected ? null : tile.id)}
            >
              <span className={c.tileLabel}>
                {tile.label}
                <Icon name="chevron-down" className={`${c.chev} ${selected ? c.chevOpen : ""}`} />
              </span>
              <span className={c.tileValue}>{tile.value}</span>
              <span className={c.tileSub}>{tile.sub}</span>
              {tile.visual}
            </button>
          );
        })}
      </div>
      {open && (
        <div id="metric-detail" className={c.detail}>
          {open.detail}
        </div>
      )}
    </div>
  );
}

/** 小さな積み上げバー（トピック到達度タイル用）。 */
export function MiniStack({ parts }: { parts: { value: number; tone: "ready" | "basic" | "work" }[]; total?: number }) {
  return (
    <span className={c.miniStack} aria-hidden>
      {parts.map((part, i) => (
        <span key={i} data-tone={part.tone} style={{ width: `${part.value}%` }} />
      ))}
    </span>
  );
}

/** 直近7日の学習有無（学習した日タイル用）。 */
export function WeekDots({ days }: { days: boolean[] }) {
  return (
    <span className={c.weekDots} aria-hidden>
      {days.map((on, i) => (
        <span key={i} data-on={on || undefined} />
      ))}
    </span>
  );
}

/** 細いバー（参考書タイル用）。 */
export function MiniBar({ percent }: { percent: number }) {
  return (
    <span className={`${c.bar} ${c.tileBar}`} aria-hidden>
      <span style={{ width: `${percent}%` }} />
    </span>
  );
}

// ───────────────────────── 4. くわしく見る ─────────────────────────

export function LinkRow({
  links,
  className,
}: {
  links: { id: string; title: string; meta?: string; href: string }[];
  className?: string;
}) {
  return (
    <nav className={`${c.links} ${className ?? ""}`} aria-label="くわしく見る" data-guide="progress-links">
      {links.map((link) => (
        <Link key={link.id} href={link.href} className={c.link}>
          <span>{link.title}</span>
          {link.meta && <span className={c.linkMeta}>{link.meta}</span>}
          <Icon name="chevron-right" className={c.chev} />
        </Link>
      ))}
    </nav>
  );
}
