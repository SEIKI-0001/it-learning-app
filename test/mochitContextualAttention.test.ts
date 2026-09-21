import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMochitAttentionGate,
  MOCHIT_ATTENTION_MAX_PENDING_MS,
  type MochitAttentionGate,
} from "@/components/mochit/mochitContextualAttention";
import {
  getMochitAttentionSnapshot,
  releaseMochitAttention,
  requestMochitAttention,
} from "@/components/mochit/mochitAttentionBus";

let gate: MochitAttentionGate;
beforeEach(() => {
  vi.useFakeTimers();
  gate = createMochitAttentionGate();
});
afterEach(() => {
  gate.dispose();
  releaseMochitAttention();
  vi.useRealTimers();
});

const look = (holdMs?: number) =>
  requestMochitAttention({ attention: "content", target: { x: 10, y: 20 }, ...(holdMs ? { holdMs } : {}) });

describe("Contextual Attention ゲート", () => {
  it("通知をすぐ反映し、holdMs 後に random（null）へ戻る", () => {
    const r = look(1500);
    gate.setRequest(r);
    expect(gate.getApplied()).toBe(r);
    vi.advanceTimersByTime(1499);
    expect(gate.getApplied()).toBe(r);
    vi.advanceTimersByTime(1);
    expect(gate.getApplied()).toBeNull();
  });

  it("random の通知（release）で即 random", () => {
    gate.setRequest(look());
    releaseMochitAttention();
    gate.setRequest(getMochitAttentionSnapshot());
    expect(gate.getApplied()).toBeNull();
  });

  it("Reaction 中は反映を待ち、終わってから hold を数える（Reaction を邪魔しない）", () => {
    gate.reactionStarted(1400);
    const r = look(1200);
    gate.setRequest(r);
    expect(gate.getApplied()).toBeNull();
    vi.advanceTimersByTime(1400);
    expect(gate.getApplied()).toBe(r);
    vi.advanceTimersByTime(1199);
    expect(gate.getApplied()).toBe(r);
    vi.advanceTimersByTime(1);
    expect(gate.getApplied()).toBeNull();
  });

  it("新しい Reaction は待ち時間を延長する（置換された Reaction も邪魔しない）", () => {
    gate.reactionStarted(800);
    gate.setRequest(look());
    vi.advanceTimersByTime(500);
    gate.reactionStarted(1400);
    vi.advanceTimersByTime(1399);
    expect(gate.getApplied()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(gate.getApplied()).not.toBeNull();
  });

  it("反映中の Reaction は視線を解除しない（Reaction は上乗せ）", () => {
    const r = look();
    gate.setRequest(r);
    gate.reactionStarted(550);
    expect(gate.getApplied()).toBe(r);
  });

  it("待たされすぎた通知は古いので捨てる", () => {
    gate.reactionStarted(MOCHIT_ATTENTION_MAX_PENDING_MS + 500);
    gate.setRequest(look(1000));
    vi.advanceTimersByTime(MOCHIT_ATTENTION_MAX_PENDING_MS + 500);
    expect(gate.getApplied()).toBeNull();
  });

  it("Sleep 中の通知は捨て、起きた後にも遅れて反映しない（起こさない）", () => {
    gate.setSleeping(true);
    gate.setRequest(look());
    expect(gate.getApplied()).toBeNull();
    gate.setSleeping(false);
    expect(gate.getApplied()).toBeNull();
    // 起きた後の新しい通知は反映する
    const next = look();
    gate.setRequest(next);
    expect(gate.getApplied()).toBe(next);
  });

  it("反映中に眠ったら random へ戻す", () => {
    gate.setRequest(look());
    gate.setSleeping(true);
    expect(gate.getApplied()).toBeNull();
  });

  it("無効化（非表示）中は random。同じ通知は二度反映しない", () => {
    const r = look(500);
    gate.setRequest(r);
    vi.advanceTimersByTime(500);
    expect(gate.getApplied()).toBeNull();
    gate.setEnabled(false);
    gate.setEnabled(true);
    gate.setRequest(r);
    expect(gate.getApplied()).toBeNull();
  });

  it("変化した時だけ購読者へ通知し、dispose 後はタイマーを残さない", () => {
    const listener = vi.fn();
    gate.subscribe(listener);
    gate.setRequest(look(1000));
    expect(listener).toHaveBeenCalledTimes(1);
    gate.setSleeping(false); // 変化なし
    expect(listener).toHaveBeenCalledTimes(1);
    gate.dispose();
    vi.advanceTimersByTime(5000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
