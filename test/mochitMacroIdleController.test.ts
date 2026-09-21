import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMacroIdleController,
  MACRO_IDLE_SETTLE_MS,
  type MacroIdlePlayer,
} from "@/components/mochit/mochitMacroIdleController";
import type { MacroIdleConditions, MochitMacroIdleBehavior } from "@/components/mochit/mochitMacroIdle";

// rng は呼び出し順に値を返す（delay → pick → duration → delay ...）
function queue(values: number[], fallback = 0) {
  const q = [...values];
  return () => (q.length > 0 ? q.shift()! : fallback);
}

type Play = { behavior: MochitMacroIdleBehavior; durationMs: number; end: () => void; stop: ReturnType<typeof vi.fn<(settleMs: number) => void>> };

function setup(rng: () => number = () => 0) {
  const plays: Play[] = [];
  const play: MacroIdlePlayer = (behavior, durationMs, onEnd) => {
    const p: Play = { behavior, durationMs, end: onEnd, stop: vi.fn<(settleMs: number) => void>() };
    plays.push(p);
    return { stop: p.stop };
  };
  const controller = createMacroIdleController({ play, rng });
  return { controller, plays };
}

const ACTIVE: Partial<MacroIdleConditions> = { active: true, reducedMotion: false, compact: false, attention: "random" };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createMacroIdleController: スケジューリング", () => {
  it("有効になると 8〜20秒後に抽選し、特殊 Behavior を再生する", () => {
    // delay=8000(rng0) → pick=stretch(0.95) → duration=min(0)
    const { controller, plays } = setup(queue([0, 0.95, 0]));
    controller.update(ACTIVE);
    expect(controller.getState().scheduled).toBe(true);
    vi.advanceTimersByTime(7999);
    expect(plays).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(plays.map((p) => p.behavior)).toEqual(["stretch"]);
    expect(plays[0].durationMs).toBe(1200);
    expect(controller.getState().playing).toBe("stretch");
  });

  it("normal は何もせず次回を待つ", () => {
    // delay 8000 → normal → delay 20000 → lookAround
    const { controller, plays } = setup(queue([0, 0.1, 0.999999, 0.6, 0]));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(8000);
    expect(plays).toHaveLength(0);
    expect(controller.getState().scheduled).toBe(true);
    vi.advanceTimersByTime(19999);
    expect(plays).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(plays.map((p) => p.behavior)).toEqual(["lookAround"]);
  });

  it("終了後は新しい待ち時間で次回を予約する", () => {
    const { controller, plays } = setup(queue([0, 0.6, 0, 0], 0));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(8000);
    expect(controller.getState().scheduled).toBe(false);
    plays[0].end();
    expect(controller.getState().playing).toBeNull();
    expect(controller.getState().scheduled).toBe(true);
    vi.advanceTimersByTime(7999);
    expect(plays).toHaveLength(1);
  });

  it("直前の特殊 Behavior を記録して抽選に渡す（連続抑制）", () => {
    // 1回目 lookAround(0.6)。2回目も 0.6 だが直前補正で normal になる
    const { controller, plays } = setup(queue([0, 0.6, 0, 0, 0.6, 0]));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(8000);
    plays[0].end();
    vi.advanceTimersByTime(8000);
    expect(plays).toHaveLength(1);
    expect(controller.getState().lastBehavior).toBe("lookAround");
  });

  it("条件が変わらない update ではタイマーを数え直さない", () => {
    const { controller, plays } = setup(queue([0, 0.95, 0]));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(5000);
    controller.update(ACTIVE);
    controller.update({ reducedMotion: false });
    vi.advanceTimersByTime(3000);
    expect(plays).toHaveLength(1);
  });
});

describe("createMacroIdleController: 優先制御", () => {
  it("Reaction 開始で Macro を即停止（settle付き）し、Reaction 後は 8秒以上待つ", () => {
    const { controller, plays } = setup(queue([0, 0.95, 0, 0, 0.95, 0], 0));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(8000);
    controller.update({ reacting: true });
    expect(plays[0].stop).toHaveBeenCalledWith(MACRO_IDLE_SETTLE_MS);
    expect(controller.getState()).toMatchObject({ playing: null, scheduled: false });
    // 停止済みの再生の終了通知は無視される
    plays[0].end();
    expect(controller.getState().scheduled).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(plays).toHaveLength(1);
    controller.update({ reacting: false });
    expect(controller.getState().scheduled).toBe(true);
    vi.advanceTimersByTime(7999);
    expect(plays).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(plays).toHaveLength(2);
  });

  it("待機中に Reaction が来たら待ち時間をリセットする", () => {
    const { controller, plays } = setup(() => 0);
    controller.update(ACTIVE);
    vi.advanceTimersByTime(7000);
    controller.update({ reacting: true });
    controller.update({ reacting: false });
    vi.advanceTimersByTime(7999);
    expect(plays).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(plays).toHaveLength(0); // rng=0 → normal。数え直しは確認できた
    expect(controller.getState().scheduled).toBe(true);
  });

  it.each(["user", "content", "result"] as const)("attention=%s では自動発火せず、random へ戻すと再開", (attention) => {
    const { controller, plays } = setup(queue([0, 0.95, 0, 0, 0.95, 0], 0));
    controller.update({ ...ACTIVE, attention });
    vi.advanceTimersByTime(60000);
    expect(plays).toHaveLength(0);
    expect(controller.getState().scheduled).toBe(false);
    controller.update({ attention: "random" });
    vi.advanceTimersByTime(8000);
    expect(plays).toHaveLength(1);
  });

  it("再生中に Semantic Attention へ変わったら Macro を止める", () => {
    const { controller, plays } = setup(queue([0, 0.6, 0], 0));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(8000);
    controller.update({ attention: "content" });
    expect(plays[0].stop).toHaveBeenCalledWith(MACRO_IDLE_SETTLE_MS);
    expect(controller.getState().playing).toBeNull();
  });
});

describe("createMacroIdleController: 無効条件と停止・復帰", () => {
  it.each([
    ["reducedMotion", { reducedMotion: true }],
    ["compact", { compact: true }],
    ["inactive", { active: false }],
  ] as const)("%s では自動発火しない", (_label, cond) => {
    const { controller, plays } = setup(queue([0, 0.95, 0], 0));
    controller.update({ ...ACTIVE, ...cond });
    vi.advanceTimersByTime(60000);
    expect(plays).toHaveLength(0);
    expect(controller.getState().scheduled).toBe(false);
  });

  it("hidden / viewport外（active=false）で即停止し、復帰時は新しい delay から", () => {
    const { controller, plays } = setup(queue([0, 0.95, 0, 0.5], 0));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(8000);
    controller.update({ active: false });
    expect(plays[0].stop).toHaveBeenCalledWith(0);
    expect(controller.getState()).toMatchObject({ playing: null, scheduled: false });
    vi.advanceTimersByTime(60000);
    controller.update({ active: true });
    // 途中再開はしない（再生はまだ無い）。delay は rng=0.5 → 14000ms
    expect(plays).toHaveLength(1);
    vi.advanceTimersByTime(13999);
    expect(plays).toHaveLength(1);
    expect(controller.getState().scheduled).toBe(true);
    vi.advanceTimersByTime(1);
    expect(controller.getState().scheduled).toBe(true); // pick=0 → normal → 次を予約
  });

  it("compact に切り替えると再生中の Macro も止める", () => {
    const { controller, plays } = setup(queue([0, 0.95, 0], 0));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(8000);
    controller.update({ compact: true });
    expect(plays[0].stop).toHaveBeenCalled();
  });

  it("dispose で停止・以後は何もしない", () => {
    const { controller, plays } = setup(queue([0, 0.95, 0], 0));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(8000);
    controller.dispose();
    expect(plays[0].stop).toHaveBeenCalledWith(0);
    controller.update(ACTIVE);
    vi.advanceTimersByTime(60000);
    expect(plays).toHaveLength(1);
  });
});

describe("createMacroIdleController: 明示再生（preview）", () => {
  it("attention を問わず1回だけ再生し、自動の待ち時間は数え直す", () => {
    const { controller, plays } = setup(() => 0);
    controller.update({ ...ACTIVE, attention: "content" });
    expect(controller.playNow("curious")).toBe(true);
    expect(plays.map((p) => p.behavior)).toEqual(["curious"]);
    plays[0].end();
    // content 中なので自動予約はしない
    expect(controller.getState().scheduled).toBe(false);
  });

  it("reduced-motion / compact / Reaction 中 / 停止中は再生しない", () => {
    for (const cond of [{ reducedMotion: true }, { compact: true }, { reacting: true }, { active: false }]) {
      const { controller, plays } = setup();
      controller.update({ ...ACTIVE, ...cond });
      expect(controller.playNow("stretch")).toBe(false);
      expect(plays).toHaveLength(0);
    }
  });

  it("再生中に別の Behavior を明示再生すると置き換える", () => {
    const { controller, plays } = setup();
    controller.update(ACTIVE);
    controller.playNow("stretch");
    controller.playNow("lookAround");
    expect(plays[0].stop).toHaveBeenCalled();
    expect(controller.getState().playing).toBe("lookAround");
    plays[0].end(); // 古い終了通知は無視
    expect(controller.getState().playing).toBe("lookAround");
  });

  it("play が null（描画不可）なら再生扱いにしない", () => {
    const controller = createMacroIdleController({ play: () => null, rng: () => 0 });
    controller.update(ACTIVE);
    expect(controller.playNow("stretch")).toBe(false);
    expect(controller.getState()).toMatchObject({ playing: null, scheduled: true });
  });
});

describe("createMacroIdleController: Sleep", () => {
  it("Sleep に入ると再生中の Macro を止め、眠っている間は発火しない", () => {
    const { controller, plays } = setup(queue([0, 0.95, 0], 0));
    controller.update(ACTIVE);
    vi.advanceTimersByTime(8000);
    expect(plays).toHaveLength(1);
    controller.update({ sleeping: true });
    expect(plays[0].stop).toHaveBeenCalledWith(MACRO_IDLE_SETTLE_MS);
    expect(controller.getState()).toMatchObject({ playing: null, scheduled: false });
    vi.advanceTimersByTime(10 * 60_000);
    expect(plays).toHaveLength(1);
    expect(controller.playNow("stretch")).toBe(false);
  });

  it("起きた後は即発火せず、新しい待ち時間（8秒以上）から", () => {
    const { controller, plays } = setup(queue([0, 0.95, 0], 0));
    controller.update({ ...ACTIVE, sleeping: true });
    vi.advanceTimersByTime(60_000);
    controller.update({ sleeping: false });
    expect(controller.getState().scheduled).toBe(true);
    vi.advanceTimersByTime(7999);
    expect(plays).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(plays).toHaveLength(1);
  });
});
