/**
 * 登録後、最初の学習問題に着くまでの段階計測（初回設定 → Today → レッスン → 問題表示 → 初回解答）。
 *
 * この端末で初回設定（/onboarding）のフォームを開いた時点から数え始め、各段階を 1 回だけ
 * public_funnel_events へ送る。初回解答まで進むか、期限（14日）を過ぎたら数えるのをやめる。
 * アカウントとは結びつけない（visitor_id は公開ページと同じ端末ごとの乱数）。
 * 保存できない環境では何もしない。ここには localStorage を扱う純粋寄りの関数だけを置く。
 */
import { FIRST_RUN_STEPS, type FirstRunStep } from "@/lib/growth/funnel";

export const FIRST_RUN_KEY = "fq_first_run";
export const FIRST_RUN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

type FirstRunRecord = { startedAt: number; sent: FirstRunStep[] };

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function read(store: KeyValueStore, now: number): FirstRunRecord | null {
  try {
    const raw = store.getItem(FIRST_RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FirstRunRecord>;
    if (typeof parsed.startedAt !== "number" || !Array.isArray(parsed.sent)) return null;
    if (now - parsed.startedAt > FIRST_RUN_TTL_MS) {
      store.removeItem(FIRST_RUN_KEY);
      return null;
    }
    return {
      startedAt: parsed.startedAt,
      sent: parsed.sent.filter((s): s is FirstRunStep => FIRST_RUN_STEPS.includes(s)),
    };
  } catch {
    return null;
  }
}

/** 計測中か（初回設定を開いてから、初回解答前・期限内）。 */
export function isFirstRunActive(store: KeyValueStore, now: number = Date.now()): boolean {
  const rec = read(store, now);
  return Boolean(rec && !rec.sent.includes("first_answer"));
}

/** その段階をまだ送っていないか。 */
export function isFirstRunStepPending(
  store: KeyValueStore,
  step: FirstRunStep,
  now: number = Date.now(),
): boolean {
  const rec = read(store, now);
  return Boolean(rec && !rec.sent.includes("first_answer") && !rec.sent.includes(step));
}

/**
 * 段階に着いたことを記録し、送るべきなら true を返す。
 * onboarding_view だけは計測を始める合図で、記録が無ければ作る（同じ端末での2回目以降は送らない）。
 */
export function claimFirstRunStep(
  store: KeyValueStore,
  step: FirstRunStep,
  now: number = Date.now(),
): boolean {
  try {
    let rec = read(store, now);
    if (!rec) {
      if (step !== "onboarding_view") return false;
      rec = { startedAt: now, sent: [] };
    }
    if (rec.sent.includes("first_answer") || rec.sent.includes(step)) return false;
    rec.sent.push(step);
    store.setItem(FIRST_RUN_KEY, JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

/** レッスン（教材と確認問題）のページか。/learn/<章>/<節>/<トピック> と /topics/<id>。 */
export function isLessonPath(pathname: string): boolean {
  return /^\/learn\/[^/]+\/[^/]+\/[^/]+\/?$/.test(pathname) || /^\/topics\/[^/]+\/?$/.test(pathname);
}
