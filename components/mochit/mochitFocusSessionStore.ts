// Focus Session のブラウザ側の置き場所（React 非依存の外部ストア）。
//   - 状態は localStorage に保存する＝ページ遷移・リロード・同じブラウザの別タブでも続く。
//   - 完了の検知は「次の境界時刻（endsAt）に1本だけ張るタイマー」＋タブ復帰時の再確認。
//     タイマーの回数では数えないので、非表示タブで間引かれても復帰した瞬間に正しくなる。
//   - 複数タブ: 状態を変える前に必ず localStorage の最新を読み直す。先に確定させたタブだけが
//     完了イベントを出し、記録は ID で重複を防ぐ。他タブの変更は storage イベントで取り込む。
// 判定そのものは mochitFocusSession.ts（純粋ロジック）。ここは保存・購読・時刻の配線だけ。
//
// 記録（完了回数・集中時間）は端末ローカルの別キーに置く。既存の学習データ（AppState /
// Supabase の学習記録）には書き込まない＝二重管理しない。

import {
  advanceFocusSession,
  appendFocusRecords,
  createIdleFocusSession,
  dismissBreakOffer,
  endFocusSession,
  nextFocusSessionBoundary,
  normalizeFocusLog,
  normalizeFocusSessionState,
  pauseFocusSession,
  resumeFocusSession,
  startBreak,
  startFocus,
  type FocusSessionEvent,
  type FocusSessionRecord,
  type FocusSessionState,
  type FocusSessionTransition,
} from "./mochitFocusSession";

export const MOCHIT_FOCUS_SESSION_STORAGE_KEY = "fequest:mochitFocusSession:v1";
export const MOCHIT_FOCUS_LOG_STORAGE_KEY = "fequest:mochitFocusLog:v1";

/** setTimeout の上限（約24.8日）。これより先の境界は途中で張り直す */
const MAX_TIMER_MS = 2_147_483_647;
/** 境界ちょうどに発火して endsAt > now になるのを避ける余白 */
const BOUNDARY_SLACK_MS = 30;

const SERVER_SNAPSHOT: FocusSessionState = createIdleFocusSession();

type Listener = () => void;
type EventListener = (event: FocusSessionEvent) => void;

let snapshot: FocusSessionState | null = null;
let snapshotRaw: string | null = null;
const listeners = new Set<Listener>();
const eventListeners = new Set<EventListener>();
let timer: ReturnType<typeof setTimeout> | null = null;
let detachWindow: (() => void) | null = null;

const now = () => Date.now();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 保存できない環境（プライベートモード等）でも、このページ内では動かし続ける
  }
}

function parse(raw: string | null): FocusSessionState {
  if (!raw) return createIdleFocusSession();
  try {
    return normalizeFocusSessionState(JSON.parse(raw));
  } catch {
    return createIdleFocusSession();
  }
}

/** localStorage の最新へ合わせる。内容が同じなら snapshot の同一性を保つ */
function syncFromStorage(): FocusSessionState {
  const raw = readRaw(MOCHIT_FOCUS_SESSION_STORAGE_KEY);
  if (snapshot === null || raw !== snapshotRaw) {
    // 保存できない環境では raw が常に null。ページ内の snapshot を正とする
    if (snapshot === null || raw !== null) snapshot = parse(raw);
    snapshotRaw = raw;
  }
  return snapshot;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function emit(events: readonly FocusSessionEvent[]): void {
  for (const event of events) for (const listener of eventListeners) listener(event);
}

export function loadFocusSessionLog(): FocusSessionRecord[] {
  const raw = readRaw(MOCHIT_FOCUS_LOG_STORAGE_KEY);
  if (!raw) return [];
  try {
    return normalizeFocusLog(JSON.parse(raw));
  } catch {
    return [];
  }
}

function persistRecords(records: readonly FocusSessionRecord[]): void {
  if (records.length === 0) return;
  writeRaw(MOCHIT_FOCUS_LOG_STORAGE_KEY, JSON.stringify(appendFocusRecords(loadFocusSessionLog(), records)));
}

/** 最新の保存状態に対して遷移を計算し、変わっていれば保存・通知・イベント発行する */
function commit(transition: (state: FocusSessionState, at: number) => FocusSessionTransition): void {
  if (typeof window === "undefined") return;
  const current = syncFromStorage();
  const result = transition(current, now());
  persistRecords(result.records);
  if (result.state !== current) {
    const raw = JSON.stringify(result.state);
    writeRaw(MOCHIT_FOCUS_SESSION_STORAGE_KEY, raw);
    snapshot = result.state;
    snapshotRaw = readRaw(MOCHIT_FOCUS_SESSION_STORAGE_KEY);
    notify();
  }
  schedule();
  emit(result.events);
}

function schedule(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  if (listeners.size === 0 || snapshot === null) return;
  const boundary = nextFocusSessionBoundary(snapshot);
  if (boundary === null) return;
  const delay = Math.min(MAX_TIMER_MS, Math.max(0, boundary - now() + BOUNDARY_SLACK_MS));
  timer = setTimeout(() => {
    timer = null;
    commit(advanceFocusSession);
  }, delay);
}

function attachWindow(): void {
  if (detachWindow || typeof window === "undefined") return;
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== MOCHIT_FOCUS_SESSION_STORAGE_KEY) return;
    const before = snapshot;
    syncFromStorage();
    if (snapshot !== before) notify();
    schedule();
  };
  // タブ復帰・bfcache 復帰: 止まっていた間に過ぎた境界をここで確定させる
  const onVisible = () => {
    if (document.visibilityState === "visible") commit(advanceFocusSession);
  };
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onVisible);
  window.addEventListener("focus", onVisible);
  detachWindow = () => {
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", onVisible);
    window.removeEventListener("focus", onVisible);
  };
}

// ---- useSyncExternalStore 用 ----

export function subscribeFocusSession(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    attachWindow();
    // 購読開始時点で既に過ぎていた境界（リロード中に終わった等）も確定させる
    commit(advanceFocusSession);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      detachWindow?.();
      detachWindow = null;
    }
  };
}

export function getFocusSessionSnapshot(): FocusSessionState {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  return syncFromStorage();
}

export function getFocusSessionServerSnapshot(): FocusSessionState {
  return SERVER_SNAPSHOT;
}

/** 集中完了・休憩終了の通知。確定させたタブでだけ1回届く */
export function subscribeFocusSessionEvents(listener: EventListener): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

// ---- 操作 ----

export const startMochitFocus = () => commit(startFocus);
export const startMochitBreak = () => commit(startBreak);
export const pauseMochitFocus = () => commit(pauseFocusSession);
export const resumeMochitFocus = () => commit(resumeFocusSession);
export const endMochitFocus = () => commit(endFocusSession);
export const dismissMochitBreakOffer = () => commit((state) => dismissBreakOffer(state));

/** テスト用: モジュール内の状態を捨てる */
export function resetFocusSessionStoreForTest(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  detachWindow?.();
  detachWindow = null;
  listeners.clear();
  eventListeners.clear();
  snapshot = null;
  snapshotRaw = null;
}
