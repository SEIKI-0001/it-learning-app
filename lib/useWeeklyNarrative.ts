"use client";

// 週間レポートの文章を用意する hook。
// - 同じ事実（payload）に対する AI 文章は localStorage に保存して再利用する。
//   学習が進んで事実が変わったときだけ作り直す（開くたびに生成しない）。
// - 学習0の週・未ログイン・AI 障害・タイムアウトはテンプレート文で表示する。

import { useEffect, useMemo, useState } from "react";
import type { WeeklyReportFacts } from "@/lib/weeklyReportFacts";
import {
  buildAiPayload,
  buildTemplateNarrative,
  mergeNarrative,
  type AiNarrativePart,
  type WeeklyNarrative,
} from "@/lib/weeklyReportNarrative";

const CACHE_KEY = "fequest:weekly-report-ai:v1";
const CLIENT_TIMEOUT_MS = 18_000;

type CacheEntry = { key: string; part: AiNarrativePart; savedAt: string };

function hash(text: string): string {
  // FNV-1a（暗号用途ではない。キャッシュの同一性判定だけに使う）
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function readCache(key: string): AiNarrativePart | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    return entry.key === key ? entry.part : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, part: AiNarrativePart) {
  try {
    const entry: CacheEntry = { key, part, savedAt: new Date().toISOString() };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // 保存できなくても表示には影響しない
  }
}

export type NarrativeStatus = "loading" | "ready";

export function useWeeklyNarrative(facts: WeeklyReportFacts): {
  narrative: WeeklyNarrative;
  status: NarrativeStatus;
} {
  const template = useMemo(() => buildTemplateNarrative(facts), [facts]);
  const payload = useMemo(() => buildAiPayload(facts), [facts]);
  const key = useMemo(
    () => (facts.volume === "none" ? null : hash(`${facts.period.end}|${JSON.stringify(payload)}`)),
    [facts, payload],
  );

  const [result, setResult] = useState<{ key: string | null; part: AiNarrativePart | null } | null>(
    null,
  );

  // 保存済みなら描画時点で使う（このページは appState 読込後にだけ描画されるので SSR とずれない）。
  const cached = useMemo(() => (key === null ? null : readCache(key)), [key]);

  useEffect(() => {
    if (key === null || cached) return;

    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    fetch("/api/weekly-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (cancelled) return;
        const json = (await res.json().catch(() => null)) as
          | { ok: true; narrative: AiNarrativePart }
          | { ok: false }
          | null;
        if (cancelled) return;
        if (json && json.ok && Object.keys(json.narrative).length > 0) {
          writeCache(key, json.narrative);
          setResult({ key, part: json.narrative });
        } else {
          setResult({ key, part: null });
        }
      })
      .catch(() => {
        // タイムアウト・通信失敗はテンプレート文で確定する（アンマウント時は何もしない）
        if (!cancelled) setResult({ key, part: null });
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, payload, cached]);

  if (key === null) return { narrative: template, status: "ready" };
  if (cached) return { narrative: mergeNarrative(template, cached), status: "ready" };
  if (!result || result.key !== key) return { narrative: template, status: "loading" };
  return { narrative: mergeNarrative(template, result.part), status: "ready" };
}
