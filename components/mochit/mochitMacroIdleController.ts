// Macro Idle の実行制御（スケジューラ）。DOM/React に依存せず、再生そのものは
// 注入された play() に任せる。MochitSvg はここへ条件の変化を通知するだけ。
//
// 優先順位: Reaction > Semantic Attention > Sleep > Macro Idle > Micro Idle
//   - Reaction 開始（reacting=true）: 再生中の Macro を即停止し、タイマーも止める。
//     Reaction 終了後は新しい待ち時間（8秒以上）から数え直す。
//   - attention が random 以外: 自動発火しない。random 以外へ変わったら再生中の Macro も止める。
//   - Sleep（sleeping=true）: 再生中の Macro を止め、タイマーも止める。起きたら即発火せず
//     新しい待ち時間（8秒以上）から数え直す。
//   - 非表示・ビューポート外・reduced-motion・compact: タイマー/再生を止め、
//     復帰時は途中再開せず新しい待ち時間から始める。
// Micro Idle（呼吸/ゆれ/アンテナ/まばたき）には一切触れない。

import type { RNG } from "./mochitIdleAnimation";
import {
  canPlayMacroIdle,
  isMacroIdleAutoEnabled,
  macroIdleDurationMs,
  nextMacroIdleDelayMs,
  pickMacroIdleBehavior,
  type MacroIdleConditions,
  type MochitMacroIdleBehavior,
} from "./mochitMacroIdle";

export type MacroIdlePlayback = {
  /** 再生を打ち切る。settleMs>0 なら現在の見た目から基底へ短く戻す */
  stop(settleMs: number): void;
};

export type MacroIdlePlayer = (
  behavior: MochitMacroIdleBehavior,
  durationMs: number,
  onEnd: () => void,
) => MacroIdlePlayback | null;

export type MacroIdleControllerDeps = {
  play: MacroIdlePlayer;
  rng?: RNG;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export type MacroIdleController = {
  /** 条件の変化を通知する（部分指定可） */
  update(next: Partial<MacroIdleConditions>): void;
  /** 明示再生（devプレビュー用）。attention は問わないが再生可能条件は守る */
  playNow(behavior: MochitMacroIdleBehavior): boolean;
  /** テスト・デバッグ用の現在状態 */
  getState(): { playing: MochitMacroIdleBehavior | null; scheduled: boolean; lastBehavior: MochitMacroIdleBehavior | null };
  dispose(): void;
};

/** Reaction / Attention 切替で打ち切るときの戻し時間（Reaction の置換 settle と同じ） */
export const MACRO_IDLE_SETTLE_MS = 90;

const INITIAL_CONDITIONS: MacroIdleConditions = {
  active: false,
  reducedMotion: false,
  compact: false,
  reacting: false,
  attention: "random",
  sleeping: false,
};

export function createMacroIdleController(deps: MacroIdleControllerDeps): MacroIdleController {
  const rng = deps.rng ?? Math.random;
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let conditions: MacroIdleConditions = { ...INITIAL_CONDITIONS };
  let timer: unknown = null;
  let playing: { behavior: MochitMacroIdleBehavior; playback: MacroIdlePlayback; token: number } | null = null;
  let token = 0;
  let lastBehavior: MochitMacroIdleBehavior | null = null;
  let disposed = false;

  const cancelTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const stopPlaying = (settleMs: number) => {
    if (!playing) return;
    const { playback } = playing;
    playing = null;
    playback.stop(settleMs);
  };

  // 新しい待ち時間から数え直す（途中から再開はしない）
  const scheduleFresh = () => {
    cancelTimer();
    if (disposed || !isMacroIdleAutoEnabled(conditions)) return;
    timer = setTimer(onTimer, nextMacroIdleDelayMs(rng));
  };

  const start = (behavior: MochitMacroIdleBehavior): boolean => {
    const myToken = ++token;
    const playback = deps.play(behavior, macroIdleDurationMs(behavior, rng), () => {
      if (!playing || playing.token !== myToken) return;
      playing = null;
      scheduleFresh();
    });
    if (!playback) return false;
    playing = { behavior, playback, token: myToken };
    lastBehavior = behavior;
    return true;
  };

  function onTimer() {
    timer = null;
    if (disposed || playing || !isMacroIdleAutoEnabled(conditions)) return;
    const choice = pickMacroIdleBehavior(lastBehavior, rng);
    // normal は何もせず次回まで待つ
    if (choice === "normal" || !start(choice)) scheduleFresh();
  }

  return {
    update(next) {
      if (disposed) return;
      const prev = conditions;
      conditions = { ...prev, ...next };
      const wasAuto = isMacroIdleAutoEnabled(prev);
      const isAuto = isMacroIdleAutoEnabled(conditions);

      if (playing) {
        if (!canPlayMacroIdle(conditions)) {
          // Reaction は短く戻してから（Reaction 側のトラックが上書きする）。
          // 非表示・reduced-motion 等は即時に基底へ（復帰時に途中から再開しない）。
          stopPlaying(conditions.active && !conditions.reducedMotion ? MACRO_IDLE_SETTLE_MS : 0);
        } else if (prev.attention !== conditions.attention && conditions.attention !== "random") {
          // Semantic Attention が Macro より優先
          stopPlaying(MACRO_IDLE_SETTLE_MS);
        }
      }

      if (!isAuto) cancelTimer();
      else if (!wasAuto && !playing) scheduleFresh();
    },
    playNow(behavior) {
      if (disposed || !canPlayMacroIdle(conditions)) return false;
      cancelTimer();
      stopPlaying(0);
      const ok = start(behavior);
      if (!ok) scheduleFresh();
      return ok;
    },
    getState() {
      return { playing: playing?.behavior ?? null, scheduled: timer !== null, lastBehavior };
    },
    dispose() {
      disposed = true;
      cancelTimer();
      stopPlaying(0);
    },
  };
}
