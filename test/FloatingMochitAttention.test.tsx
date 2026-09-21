// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import FloatingMochit from "@/components/mochit/FloatingMochit";
import { emitMochitEvent } from "@/components/mochit/mochitEventBus";
import { releaseMochitAttention, requestMochitAttention } from "@/components/mochit/mochitAttentionBus";
import { attentionPointToGazeOffset, viewportTargetToAttentionPoint } from "@/components/mochit/mochitAttention";
import { getIdleProfile } from "@/components/mochit/mochitIdleAnimation";
import { FLOATING_MOCHIT_HIT_SIZE } from "@/components/mochit/floatingMochitLayout";

// FloatingMochit × Contextual Attention の結合。描画は本物の MochitSvg（WAAPI はスタブで記録）。

const storageValues = new Map<string, string>();
beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return storageValues.size;
      },
      clear: () => storageValues.clear(),
      getItem: (key: string) => storageValues.get(key) ?? null,
      key: (index: number) => [...storageValues.keys()][index] ?? null,
      removeItem: (key: string) => storageValues.delete(key),
      setItem: (key: string, value: string) => storageValues.set(key, String(value)),
    } satisfies Storage,
  });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390, writable: true });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 844, writable: true });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});

type AnimationRecord = { el: Element; options: KeyframeAnimationOptions };
let records: AnimationRecord[] = [];

beforeEach(() => {
  records = [];
  vi.useFakeTimers({ shouldAdvanceTime: true });
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: function animate(this: Element, _keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      records.push({ el: this, options });
      const anim = {
        playState: "running",
        effect: { setKeyframes: vi.fn() },
        updatePlaybackRate: vi.fn(),
        cancel: vi.fn(() => (anim.playState = "idle")),
        finished: new Promise(() => {}),
      };
      return anim;
    },
  });
});

afterEach(() => {
  cleanup();
  releaseMochitAttention();
  window.localStorage.clear();
  vi.clearAllTimers();
  vi.useRealTimers();
  delete (Element.prototype as { animate?: unknown }).animate;
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
// FloatingMochit は floating プロファイル（84px 用に視線レンジを拡大）
const gaze = getIdleProfile(false, true).gaze!;

async function renderPet(reducedMotion = false) {
  render(<FloatingMochit reducedMotion={reducedMotion} />);
  const pet = await screen.findByRole("button", { name: "モチットを触る" });
  await waitFor(() => expect(pet.querySelector("#Pupil_L")).not.toBeNull());
  const svg = pet.querySelector<SVGSVGElement>("svg")!;
  const pupil = pet.querySelector<SVGGraphicsElement>("#Pupil_L")!;
  const eye = () => {
    const root = pet.parentElement!;
    return {
      x: parseFloat(root.style.left) + FLOATING_MOCHIT_HIT_SIZE / 2,
      y: parseFloat(root.style.top) + FLOATING_MOCHIT_HIT_SIZE / 2,
    };
  };
  return { pet, svg, pupil, eye };
}

const expectedPoint = (target: { x: number; y: number }, eye: { x: number; y: number }) =>
  viewportTargetToAttentionPoint(target, eye);
const pointAttr = (p: { x: number; y: number }) => `${p.x},${p.y}`;
const offsetTransform = (p: { x: number; y: number }) => {
  const o = attentionPointToGazeOffset(p, gaze);
  return `translate(${o.x}px, ${o.y}px)`;
};
/** 外側<svg>（body）への有限アニメ＝Macro Idle / Reaction */
const bodyAnims = (svg: Element) =>
  records.filter((r) => r.el === svg && r.options.iterations !== Infinity);
const loops = () => records.filter((r) => r.options.iterations === Infinity);

describe("FloatingMochit: Contextual Attention の反映", () => {
  it("ページからの target を、自分の位置から見た attentionPoint に変換して視線へ", async () => {
    const { pet, pupil, eye } = await renderPet();
    expect(pet).toHaveAttribute("data-attention", "random");
    const target = { x: 120, y: 420 };
    act(() => {
      requestMochitAttention({ attention: "content", target });
    });
    const point = expectedPoint(target, eye());
    expect(pet).toHaveAttribute("data-attention", "content");
    expect(pet).toHaveAttribute("data-attention-point", pointAttr(point));
    // 右上の既定位置から左下の対象 → 左下を見る
    expect(point.x).toBeLessThan(0.5);
    expect(point.y).toBeGreaterThan(0.5);
    expect(pupil.style.transform).toBe(offsetTransform(point));
  });

  it("user は正面（point なし）", async () => {
    const { pet, pupil } = await renderPet();
    act(() => {
      requestMochitAttention({ attention: "user" });
    });
    expect(pet).toHaveAttribute("data-attention", "user");
    expect(pet).not.toHaveAttribute("data-attention-point");
    expect(pupil.style.transform).toBe("translate(0px, 0px)");
  });

  it("holdMs 後と release で random へ戻る", async () => {
    const { pet } = await renderPet();
    act(() => {
      requestMochitAttention({ attention: "content", target: { x: 10, y: 10 }, holdMs: 1500 });
    });
    advance(1499);
    expect(pet).toHaveAttribute("data-attention", "content");
    advance(1);
    expect(pet).toHaveAttribute("data-attention", "random");

    act(() => {
      requestMochitAttention({ attention: "content", target: { x: 10, y: 10 } });
    });
    expect(pet).toHaveAttribute("data-attention", "content");
    act(() => releaseMochitAttention());
    expect(pet).toHaveAttribute("data-attention", "random");
  });

  it("ドラッグ中は更新せず、ドラッグ後に同じ対象への向きを計算し直す", async () => {
    const { pet, eye } = await renderPet();
    const target = { x: 200, y: 400 };
    act(() => {
      requestMochitAttention({ attention: "content", target });
    });
    const before = expectedPoint(target, eye());
    expect(pet).toHaveAttribute("data-attention-point", pointAttr(before));

    fireEvent.pointerDown(pet, { pointerId: 1, button: 0, clientX: 330, clientY: 44 });
    fireEvent.pointerMove(pet, { pointerId: 1, clientX: 0, clientY: 900 });
    fireEvent.pointerMove(pet, { pointerId: 1, clientX: -100, clientY: 880 });
    expect(pet).toHaveAttribute("data-motion", "dragging");
    expect(pet).toHaveAttribute("data-attention-point", pointAttr(before));

    fireEvent.pointerUp(pet, { pointerId: 1, button: 0, clientX: -100, clientY: 900 });
    const after = expectedPoint(target, eye());
    expect(pet).toHaveAttribute("data-attention-point", pointAttr(after));
    // 右上 → 左下へ移動: 同じ対象が「左下」から「右上」寄りの方向へ変わる
    expect(before.x).toBeLessThan(0.5);
    expect(after.x).toBeGreaterThan(0.5);
    expect(after.y).toBeLessThan(0.5);
  });
});

describe("FloatingMochit: Reaction / Macro Idle / Sleep との関係", () => {
  it("Reaction 中は反映を待ち、終わってから見る（taskComplete → Reaction → 次の対象 → 通常）", async () => {
    const { pet } = await renderPet();
    const mochit = pet.querySelector(".mochit")!;
    act(() => {
      emitMochitEvent("taskComplete");
    });
    expect(mochit).toHaveAttribute("data-active-event", "taskComplete");
    act(() => {
      requestMochitAttention({ attention: "content", target: { x: 100, y: 500 }, holdMs: 1200 });
    });
    expect(pet).toHaveAttribute("data-attention", "random");
    advance(1400);
    expect(pet).toHaveAttribute("data-attention", "content");
    // Reaction の優先度制御は変わらない（受理・置換は従来どおり）
    advance(1200);
    expect(pet).toHaveAttribute("data-attention", "random");
  });

  it("Contextual Attention 中は自動 Macro Idle を止め、random へ戻ると再開する", async () => {
    const { pet, svg } = await renderPet();
    act(() => {
      requestMochitAttention({ attention: "content", target: { x: 100, y: 500 } });
    });
    advance(25_000);
    expect(bodyAnims(svg)).toHaveLength(0);
    expect(pet).toHaveAttribute("data-sleep", "awake");
    act(() => releaseMochitAttention());
    advance(21_000);
    expect(bodyAnims(svg).length).toBeGreaterThan(0);
  });

  it("Sleep 中の通知では起こさず・視線も動かさない。起きた後にも反映しない", async () => {
    const { pet } = await renderPet();
    advance(60_000);
    expect(pet).toHaveAttribute("data-sleep", "sleepy");
    act(() => {
      requestMochitAttention({ attention: "content", target: { x: 100, y: 500 }, holdMs: 1500 });
    });
    expect(pet).toHaveAttribute("data-sleep", "sleepy");
    expect(pet).toHaveAttribute("data-attention", "random");
    advance(5_000);
    expect(pet).toHaveAttribute("data-sleep", "sleepy");
    fireEvent.keyDown(document.body, { key: "a" });
    expect(pet).toHaveAttribute("data-sleep", "awake");
    expect(pet).toHaveAttribute("data-attention", "random");
  });

  it("attention の変更で SVG・Micro Idle を作り直さない", async () => {
    const { pet, pupil } = await renderPet();
    const loopCount = loops().length;
    expect(loopCount).toBeGreaterThan(0);
    act(() => {
      requestMochitAttention({ attention: "user" });
    });
    act(() => {
      requestMochitAttention({ attention: "content", target: { x: 30, y: 700 } });
    });
    act(() => releaseMochitAttention());
    expect(loops()).toHaveLength(loopCount);
    expect(pet.querySelector("#Pupil_L")).toBe(pupil);
  });
});

describe("FloatingMochit: reduced-motion", () => {
  it("視線位置は静的に反映し、視線移動アニメーションは出さない", async () => {
    const { pet, pupil, eye } = await renderPet(true);
    const target = { x: 60, y: 600 };
    act(() => {
      requestMochitAttention({ attention: "content", target });
    });
    expect(pet).toHaveAttribute("data-attention", "content");
    expect(pupil.style.transform).toBe(offsetTransform(expectedPoint(target, eye())));
    expect(records.filter((r) => r.el === pupil)).toHaveLength(0);
  });
});
