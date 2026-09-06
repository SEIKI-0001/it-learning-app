// GF-P0-006 のスケジューラー（Cloudflare Cron Trigger 専用の薄い Worker）。
//
// この Worker がやることは1つだけ:
//   毎時起動され、it-learning-app の /api/cron/line-reminder を
//   `Authorization: Bearer ${CRON_SECRET}` 付きで GET する。
//
// 意図的に持たないもの（Single Source of Truth を割らないため）:
//   - 通知判定（誰に・いつ・どの種別か）… lib/notifications/schedule.ts
//   - Supabase アクセス・冪等性の管理 …… lib/notifications/service.ts
//   - LINE への送信 ………………………… lib/line/messaging.ts
//   したがって Supabase の鍵も LINE のアクセストークンもこの Worker には渡さない。
//   ここが落ちても、通知DB にも学習状態にも触れない（触る手段を持たない）。
//
// Cloudflare Cron は UTC 基準で起動するが、ユーザーごとの通知時刻の判定は
// アプリ側の timezone / ローカル日付ロジックが行う。起動時刻をユーザー時刻として扱わない。
//
// このファイルは default export だけを持つ。workerd はエントリモジュールに
// ハンドラー以外の名前付きエクスポートがあると起動しない（定数などは trigger.ts へ）。

import {
  triggerLineReminder,
  type Env,
  type ExecutionContext,
  type ScheduledController,
} from "./trigger";

/** Cloudflare が呼ぶ形（引数は3つ）。実装側は使う引数だけを受け取る。 */
type ScheduledHandler = {
  scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void>;
};

// Cron 起動のたびに通知APIを1回叩く。ここに判定を足さないこと。
const handler: ScheduledHandler = {
  async scheduled(_controller, env) {
    await triggerLineReminder(env);
  },
};

export default handler;
