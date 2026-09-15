// GF-P0-006 通知文（純関数）。
//
// §9.3 文言ルールを本文側の制約として持つ:
//   - 責めない。空いた日数は事実として一度だけ触れ、遅れや失敗として書かない。
//   - ストリーク危機は「失う」ではなく「短時間で守れる」を主文にする。
//   - 焦らせず、必ず次の具体行動を1つ示す。
//   - 根拠のない保証表現（必ず合格など）を使わない。
// 表示語彙は GF-P1-011 に従う（「今日の3ミッション」「突破試験」など）。

import type { NotificationType } from "@/types/notification";
import type { NotificationDecision } from "@/lib/notifications/schedule";

/** 通知タップ後の着地先。復帰導線も含めて /today に集約する。 */
const DEEP_LINK_PATH = "/today";

/**
 * 通知に載せる URL。LINE セッショントークンがあれば付けてログイン状態で着地させる。
 * `from` は送信→クリックの最小限の紐づけ（GF-P0-006 Measurement）。
 */
export function notificationLink(
  baseUrl: string,
  token: string | null,
  type: NotificationType,
): string {
  const params = new URLSearchParams();
  if (token) params.set("t", token);
  params.set("from", `line_${type}`);
  return `${baseUrl.replace(/\/+$/, "")}${DEEP_LINK_PATH}?${params.toString()}`;
}

/** 種別と状況から本文を組み立てる。 */
export function buildNotificationText(
  decision: NotificationDecision,
  link: string,
): string {
  if (decision.type === "comeback") {
    return [
      "おかえりなさい🌱",
      decision.daysAway === null
        ? "いつでも、ここから再開できます。"
        : `${decision.daysAway}日ぶりですね。ここから再開できます。`,
      "まずは3〜5分で終わる短い確認からどうぞ。",
      link,
    ].join("\n");
  }

  if (decision.type === "streak_risk") {
    return [
      `🔥 連続学習${decision.streakCount}日は、3分あれば今日も続けられます。`,
      "今日の3ミッションのうち1つだけで大丈夫です。",
      link,
    ].join("\n");
  }

  return [
    "今日の学習の時間です📖",
    "今日の3ミッションから、1つだけ選んで始められます。",
    link,
  ].join("\n");
}
