"use client";

// 確認パックのトピック別ステージ（topic_progress.stage）を Today で使うためのキャッシュ。
//
// 正はサーバ（topic_progress）。Today は「用語定着中（terms_stabilizing）」のトピックを
// 知るためにここを読む。サーバから取れたときはそれで丸ごと置き換え、取れないとき
// （未ログイン・オフライン・Supabase 未設定）は、確認パックを終えたときに端末へ
// 残した判定結果で代用する。どちらの場合も Today の「何を出すか」の参考にするだけで、
// ステージそのもの（本番対応OK・合格準備度）はここから動かさない。
//
// キーは fequest: プレフィクス（ログアウト・アカウント切替時にまとめて消える）。

import type { TopicStage } from "@/types/studyProgress";
import { getUserId } from "@/lib/userSession";

const STORAGE_KEY = "fequest:topicStages:v1";

export type TopicStageMap = Record<string, TopicStage>;

function read(): TopicStageMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as TopicStageMap) : {};
  } catch {
    return {};
  }
}

function write(map: TopicStageMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 表示の参考値なので、保存できなくても学習は止めない。
  }
}

/** 端末に残っているステージ（即時表示用）。 */
export function loadCachedTopicStages(): TopicStageMap {
  return read();
}

/** 確認パックを終えたときの判定結果を端末に残す（サーバ結果があればそれを渡す）。 */
export function rememberTopicStage(topicId: string, stage: TopicStage): void {
  write({ ...read(), [topicId]: stage });
}

/**
 * サーバから全トピックのステージを取得してキャッシュを置き換える。
 * 未ログイン・失敗時は端末のキャッシュをそのまま返す。
 */
export async function refreshTopicStages(): Promise<TopicStageMap> {
  const userId = getUserId();
  if (!userId) return read();
  try {
    const res = await fetch("/api/topic-progress/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, all: true }),
    });
    if (!res.ok) return read();
    const data = (await res.json()) as { ok: boolean; stages?: TopicStageMap };
    if (!data.ok || !data.stages) return read();
    write(data.stages);
    return data.stages;
  } catch {
    return read();
  }
}
