// バッジ獲得のグローバル通知バス（クライアント専用）。
//
// バッジ付与は /today・/review・確認問題（completeStudySession）と
// useBadgeSync（catch-up）のどこでも起きるため、どの画面にいても
// 「新しい装備が解放された」ことを知らせる経路を1本にまとめる。
// 発火側は emitUnlockNotice を呼ぶだけ、表示は layout 常駐の
// UnlockNoticeHost が担当する（突破試験の勝利画面はページ内演出を
// 持っているのでこのバスを使わない）。

import type { AppState } from "@/types";
import { getBadge } from "@/lib/badges";

export type UnlockNotice = {
  /** 今回新たに獲得したバッジ名（画面側で別途表示済みなら空でよい）。 */
  badgeLabels: string[];
};

const UNLOCK_NOTICE_EVENT = "fequest:unlock-notice";

/**
 * 学習前後の状態差分からバッジ通知を発火する。
 * 新規バッジが無ければ何もしない。SSR中も no-op。
 * badgeIds を渡すとバッジ名もトーストに載せる（画面内に独自の
 * バッジ演出がある呼び出し元は渡さず、装備解放だけ通知する）。
 */
export function emitUnlockNotice(
  _before: AppState,
  after: AppState,
  badgeIds: string[] = [],
): void {
  if (typeof window === "undefined") return;
  const notice: UnlockNotice = {
    badgeLabels: badgeIds
      .map((id) => getBadge(id)?.label)
      .filter((l): l is string => !!l),
  };
  if (notice.badgeLabels.length === 0) return;
  window.dispatchEvent(
    new CustomEvent<UnlockNotice>(UNLOCK_NOTICE_EVENT, { detail: notice }),
  );
}

/** 解放通知を購読する。返り値は購読解除関数。 */
export function subscribeUnlockNotice(
  onNotice: (notice: UnlockNotice) => void,
): () => void {
  const handler = (e: Event) => {
    onNotice((e as CustomEvent<UnlockNotice>).detail);
  };
  window.addEventListener(UNLOCK_NOTICE_EVENT, handler);
  return () => window.removeEventListener(UNLOCK_NOTICE_EVENT, handler);
}
