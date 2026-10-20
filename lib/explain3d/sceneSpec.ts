// AI が返した JSON を、画面で安全に描ける形へ整える（純粋関数・サーバーとテストで使う）。
// 知らない部品・知らない物の id・長すぎる文は捨てるか切り詰める。描けるだけの中身が残らなければ null。

import {
  ACTOR_KINDS,
  EXPLAIN3D_LIMITS as L,
  ITEM_KINDS,
  STEP_TONES,
  type ActorKind,
  type GeneratedScene,
  type ItemKind,
  type SceneActor,
  type SceneMove,
  type SceneStep,
  type StepTone,
} from "./types";

const ACTOR_SET = new Set<string>(ACTOR_KINDS);
const ITEM_SET = new Set<string>(ITEM_KINDS);
const TONE_SET = new Set<string>(STEP_TONES);

/** 画面に出す1行の文。改行・山括弧・バッククォートを落として切り詰める */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const text = value.replace(/[\r\n\t]+/g, " ").replace(/[<>`]/g, "").replace(/\s{2,}/g, " ").trim();
  return [...text].slice(0, max).join("");
}

const cleanId = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, 24).replace(/[^\w-]/g, "") : "";

function parseActors(value: unknown): SceneActor[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const actors: SceneActor[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = cleanId(r.id);
    const kind = typeof r.kind === "string" && ACTOR_SET.has(r.kind) ? (r.kind as ActorKind) : null;
    const name = cleanText(r.name, L.actorNameMaxLength);
    if (!id || !kind || !name || seen.has(id)) continue;
    seen.add(id);
    actors.push({ id, kind, name });
    if (actors.length >= L.actorsMax) break;
  }
  return actors;
}

function parseMove(value: unknown, ids: Set<string>): SceneMove | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  const from = cleanId(r.from);
  const to = cleanId(r.to);
  if (!ids.has(from) || !ids.has(to) || from === to) return null;
  const item = typeof r.item === "string" && ITEM_SET.has(r.item) ? (r.item as ItemKind) : "parcel";
  const tag = cleanText(r.tag, L.tagMaxLength) || "データ";
  const body = cleanText(r.body, L.bodyMaxLength);
  return { from, to, item, tag, ...(body ? { body } : {}), ...(r.locked === true ? { locked: true } : {}) };
}

const idList = (value: unknown, ids: Set<string>) =>
  Array.isArray(value) ? [...new Set(value.map(cleanId).filter((id) => ids.has(id)))] : [];

function parseSteps(value: unknown, ids: Set<string>): SceneStep[] {
  if (!Array.isArray(value)) return [];
  const steps: SceneStep[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const caption = cleanText(r.caption, L.captionMaxLength);
    if (!caption) continue;
    const title = cleanText(r.title, L.stepTitleMaxLength) || `STEP ${steps.length + 1}`;
    const tone = typeof r.tone === "string" && TONE_SET.has(r.tone) ? (r.tone as StepTone) : "info";
    const move = parseMove(r.move, ids);
    const active = idList(r.active, ids);
    // 動きがあるのに光らせる物が無いときは、受け取る側を光らせる
    if (move && active.length === 0) active.push(move.to);
    steps.push({ title, caption, tone, active, alert: idList(r.alert, ids), move });
    if (steps.length >= L.stepsMax) break;
  }
  return steps;
}

export function parseGeneratedScene(value: unknown): GeneratedScene | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  const actors = parseActors(r.actors);
  if (actors.length < L.actorsMin) return null;
  const ids = new Set(actors.map((a) => a.id));
  const steps = parseSteps(r.steps, ids);
  if (steps.length < L.stepsMin) return null;
  // 一度も出番の無い物は置かない（模型が散らからないように）
  const used = new Set(steps.flatMap((s) => [...s.active, ...s.alert, ...(s.move ? [s.move.from, s.move.to] : [])]));
  const placed = actors.filter((a) => used.has(a.id));
  if (placed.length < L.actorsMin) return null;
  const title = cleanText(r.title, L.titleMaxLength);
  if (!title) return null;
  return { title, summary: cleanText(r.summary, L.summaryMaxLength), actors: placed, steps };
}

export type ParsedExplainOutput =
  | { mode: "existing"; topicId: string; reason: string }
  | { mode: "generated"; scene: GeneratedScene; relatedTopicId: string | null }
  | { mode: "off_topic" };

/** AI の出力全体を読む。knownTopicIds に無いテーマは使わない */
export function parseExplainOutput(
  value: unknown,
  opts: { existingTopicIds: ReadonlySet<string>; knownTopicIds: ReadonlySet<string> },
): ParsedExplainOutput | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (r.mode === "off_topic") return { mode: "off_topic" };
  if (r.mode === "existing") {
    const topicId = typeof r.topicId === "string" ? r.topicId : "";
    if (!opts.existingTopicIds.has(topicId)) return null;
    return { mode: "existing", topicId, reason: cleanText(r.reason, L.summaryMaxLength) };
  }
  if (r.mode === "generated") {
    const scene = parseGeneratedScene(r.scene);
    if (!scene) return null;
    const related = typeof r.relatedTopicId === "string" && opts.knownTopicIds.has(r.relatedTopicId) ? r.relatedTopicId : null;
    return { mode: "generated", scene, relatedTopicId: related };
  }
  return null;
}
