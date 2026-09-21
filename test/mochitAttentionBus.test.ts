import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMochitAttentionServerSnapshot,
  getMochitAttentionSnapshot,
  releaseMochitAttention,
  requestMochitAttention,
  subscribeMochitAttention,
} from "@/components/mochit/mochitAttentionBus";

afterEach(() => {
  releaseMochitAttention();
});

describe("mochitAttentionBus: 通知（ページ → FloatingMochit）", () => {
  it("初期値・サーバー値は random", () => {
    expect(getMochitAttentionServerSnapshot().attention).toBe("random");
    expect(getMochitAttentionSnapshot().attention).toBe("random");
  });

  it("target 付きで通知でき、購読者へ届き、現在値として後から読める", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMochitAttention(listener);
    const request = requestMochitAttention({ attention: "content", target: { x: 120, y: 340 }, holdMs: 1500 }, "today");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getMochitAttentionSnapshot()).toBe(request);
    expect(request).toMatchObject({ attention: "content", target: { x: 120, y: 340 }, holdMs: 1500, source: "today" });
    unsubscribe();
    requestMochitAttention({ attention: "user" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("通知ごとに id が増え、新しい通知が前の通知を置き換える", () => {
    const a = requestMochitAttention({ attention: "user" });
    const b = requestMochitAttention({ attention: "user" });
    expect(b.id).toBeGreaterThan(a.id);
    expect(getMochitAttentionSnapshot()).toBe(b);
  });

  it("異常な target / holdMs は捨てる（正面・保持なし扱い）", () => {
    const r = requestMochitAttention({ attention: "content", target: { x: Number.NaN, y: 1 }, holdMs: -5 });
    expect(r.target).toBeUndefined();
    expect(r.holdMs).toBeUndefined();
  });

  it("release は random へ戻す。source 指定時は他の通知元を消さない", () => {
    requestMochitAttention({ attention: "content", target: { x: 1, y: 1 } }, "other");
    releaseMochitAttention("today");
    expect(getMochitAttentionSnapshot().attention).toBe("content");
    releaseMochitAttention("other");
    expect(getMochitAttentionSnapshot().attention).toBe("random");
  });
});
