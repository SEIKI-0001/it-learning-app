// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TodayCueSheet from "@/components/today/TodayCueSheet";
import type { TodaySlot } from "@/components/today/todaySlots";
import type { TodayPrimaryAction } from "@/types/gameful";
import {
  TODAY_MOCHIT_ATTENTION_SOURCE,
  TODAY_MOCHIT_ATTENTION_TIMING,
} from "@/components/today/useTodayMochitAttention";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
import {
  getMochitAttentionSnapshot,
  releaseMochitAttention,
  requestMochitAttention,
} from "@/components/mochit/mochitAttentionBus";

// /today → 常駐モチットへの Contextual Attention 通知。モチット本体の描画はここでは不要。
vi.mock("@/components/mochit/Mochit", () => ({ default: () => null }));

// jsdom はレイアウトしないので、見出し行と開始ボタンに位置を与える
const PRIMARY_RECT = { left: 20, top: 300, width: 200, height: 40 };
const CTA_RECT = { left: 40, top: 420, width: 160, height: 44 };
const center = (r: typeof PRIMARY_RECT) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const r = this.tagName === "A" ? CTA_RECT : PRIMARY_RECT;
    return { ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON() {} } as DOMRect;
  });
});

afterEach(() => {
  cleanup();
  releaseMochitAttention();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const slot = (id: string, state: TodaySlot["state"], start: number): TodaySlot => ({
  id,
  topicId: id,
  title: `トピック ${id}`,
  field: "",
  kind: "new",
  activity: "learn",
  minutes: 5,
  start,
  state,
});

function renderSheet(slots: TodaySlot[], primary: TodayPrimaryAction | null = null) {
  return render(
    <TodayCueSheet
      slots={slots}
      primary={primary}
      hrefFor={(s) => `/learn/${s.topicId}`}
      aiGradingHrefFor={() => null}
    />,
  );
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const current = () => getMochitAttentionSnapshot();
const { userMs, primaryMs, nextMs } = TODAY_MOCHIT_ATTENTION_TIMING;

describe("Today → FloatingMochit: 表示直後の控えめな誘導", () => {
  it("user（約0.8秒）→ 今日の最優先タスク（hold 1.5秒）を通知する", () => {
    renderSheet([slot("a", "done", 0), slot("b", "now", 5), slot("c", "next", 10)]);
    expect(current()).toMatchObject({ attention: "user", source: TODAY_MOCHIT_ATTENTION_SOURCE });
    advance(userMs - 1);
    expect(current().attention).toBe("user");
    advance(1);
    expect(current()).toMatchObject({
      attention: "content",
      target: center(PRIMARY_RECT),
      holdMs: primaryMs,
      source: TODAY_MOCHIT_ATTENTION_SOURCE,
    });
  });

  it("最優先タスクが無い日（全部完了）は何も通知しない", () => {
    renderSheet([slot("a", "done", 0), slot("b", "done", 5)]);
    advance(5000);
    expect(current().attention).toBe("random");
  });

  it("突破試験が先頭のときは、その行を見る", () => {
    const finalExam: TodayPrimaryAction = {
      kind: "final_exam",
      topicId: null,
      title: "CP1 突破試験",
      estimatedMinutes: null,
      questionCount: 10,
      reasonLabel: "必須バッジがそろいました",
      href: "/checkpoint/cp1/final",
      activity: "learn",
    };
    const view = renderSheet([slot("a", "now", 0)], finalExam);
    advance(userMs);
    expect(current()).toMatchObject({ attention: "content", target: center(PRIMARY_RECT) });
    // ref は1行だけ: 突破試験が先頭なら、ルート側の行は「いま」にならない（従来どおり）
    expect(view.container.querySelectorAll('li[data-state="now"]')).toHaveLength(1);
  });
});

describe("Today → FloatingMochit: taskComplete 後", () => {
  it("次の開始ボタンがあれば、描画後にそこを短く見る通知を出す（登場の続きは取り消す）", () => {
    renderSheet([slot("a", "done", 0), slot("b", "now", 5)]);
    act(() => {
      emitMochitEvent("taskComplete");
    });
    advance(40); // 2フレーム
    const look = current();
    expect(look).toMatchObject({ attention: "content", target: center(CTA_RECT), holdMs: nextMs });
    advance(userMs + primaryMs);
    expect(current()).toBe(look);
  });

  it("次が無ければ何もしない", () => {
    renderSheet([slot("a", "done", 0)]);
    act(() => {
      emitMochitEvent("taskComplete");
    });
    advance(100);
    expect(current().attention).toBe("random");
  });

  it("taskComplete 以外の学習イベントでは動かない", () => {
    renderSheet([slot("a", "now", 0)]);
    advance(userMs);
    const intro = current();
    act(() => {
      emitMochitEvent("correct");
    });
    advance(100);
    expect(current()).toBe(intro);
  });
});

describe("Today → FloatingMochit: ページ離脱で解除", () => {
  it("アンマウントで random へ戻し、予定していた通知も出さない", () => {
    const view = renderSheet([slot("a", "now", 0)]);
    expect(current().attention).toBe("user");
    view.unmount();
    expect(current().attention).toBe("random");
    advance(5000);
    expect(current().attention).toBe("random");
    act(() => {
      emitMochitEvent("taskComplete");
    });
    advance(100);
    expect(current().attention).toBe("random");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("他の通知元の attention は消さない", () => {
    const view = renderSheet([slot("a", "now", 0)]);
    requestMochitAttention({ attention: "result" }, "elsewhere");
    view.unmount();
    expect(current()).toMatchObject({ attention: "result", source: "elsewhere" });
  });
});

describe("Today の学習表示は変えない", () => {
  it("行の状態・開始ボタンのリンクは従来どおり", () => {
    const view = renderSheet([slot("a", "done", 0), slot("b", "now", 5), slot("c", "next", 10)]);
    const states = [...view.container.querySelectorAll("li")].map((li) => li.getAttribute("data-state"));
    expect(states).toEqual(["done", "now", "next", "finish"]);
    expect(view.getByRole("link", { name: /レッスンを始める/ })).toHaveAttribute("href", "/learn/b");
  });
});
