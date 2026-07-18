// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Mochit from "@/components/mochit/Mochit";

// Rive本体（WASM/canvas）はjsdomでは動かないため、契約に沿ったスタブへ差し替える。
// onReady/onLoadFailed/registerTriggerFirer の呼び出しタイミングだけ本物と揃える。
const riveStubMode = vi.hoisted(() => ({ current: "ready" as "ready" | "fail" }));
const firedTriggers = vi.hoisted(() => ({ current: [] as string[] }));

vi.mock("@/components/mochit/MochitRive", async () => {
  const React = await import("react");
  type StubProps = {
    onReady?: () => void;
    onLoadFailed?: (error: unknown) => void;
    registerTriggerFirer?: (firer: ((trigger: string) => void) | null) => void;
    ariaLabel: string;
  };
  function MochitRiveStub(props: StubProps) {
    const [failed, setFailed] = React.useState(riveStubMode.current === "fail");
    React.useEffect(() => {
      if (riveStubMode.current === "fail") {
        setFailed(true);
        props.onLoadFailed?.(new Error("simulated load error"));
        return;
      }
      props.registerTriggerFirer?.((trigger) => firedTriggers.current.push(trigger));
      props.onReady?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    if (failed) return null;
    return <div data-testid="mochit-rive" role="img" aria-label={props.ariaLabel} />;
  }
  return { default: MochitRiveStub };
});

afterEach(() => {
  cleanup();
  riveStubMode.current = "ready";
  firedTriggers.current = [];
});

describe("Mochit (後方互換)", () => {
  it("selects the requested state image and presents its message", () => {
    render(
      <Mochit
        state="happy"
        size="medium"
        message="いいね。知識がつながってきた！"
        animation="bounce"
        growthStage={3}
      />,
    );

    expect(screen.getByRole("img", { name: "よろこぶモチット" })).toHaveAttribute(
      "src",
      expect.stringContaining("%2Fcharacters%2Fmochit%2Fhappy.webp"),
    );
    expect(screen.getByText("いいね。知識がつながってきた！")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "よろこぶモチット" })).toHaveClass("mochit-growth-3");
  });
});

describe("Mochit (レンダラー選択)", () => {
  it("renders the WebP fallback when no .riv asset is available (default)", async () => {
    render(<Mochit state="normal" size="medium" />);
    // jsdomではHEADプローブが失敗し missing 扱いになる → フォールバック維持
    const img = await screen.findByRole("img", { name: "モチット" });
    expect(img.tagName).toBe("IMG");
    expect(screen.queryByTestId("mochit-rive")).not.toBeInTheDocument();
  });

  it("renders the WebP fallback when rendererOverride forces it", () => {
    render(<Mochit state="thinking" rendererOverride="fallback" />);
    expect(screen.getByRole("img", { name: "考えるモチット" })).toHaveAttribute(
      "src",
      expect.stringContaining("thinking.webp"),
    );
  });

  it("mounts the Rive renderer when forced and hides the fallback once ready", async () => {
    render(<Mochit state="normal" size="medium" rendererOverride="rive" />);
    await screen.findByTestId("mochit-rive");
    await waitFor(() => {
      const images = screen.queryAllByRole("img", { name: "モチット" });
      expect(images.some((el) => el.tagName === "IMG")).toBe(false);
    });
  });

  it("falls back to the WebP image when the Rive asset fails to load", async () => {
    riveStubMode.current = "fail";
    render(<Mochit state="normal" size="medium" rendererOverride="rive" />);
    await waitFor(() => {
      const img = screen.getByRole("img", { name: "モチット" });
      expect(img.tagName).toBe("IMG");
    });
    expect(screen.queryByTestId("mochit-rive")).not.toBeInTheDocument();
  });

  it("keeps identical layout dimensions between fallback and Rive containers", async () => {
    const fallback = render(<Mochit state="normal" size="large" rendererOverride="fallback" />);
    const fallbackBox = fallback.container.querySelector(".mochit > div");
    const fallbackClass = fallbackBox?.className;
    expect(fallbackClass).toContain("h-60 w-60");
    fallback.unmount();

    const rive = render(<Mochit state="normal" size="large" rendererOverride="rive" />);
    await screen.findByTestId("mochit-rive");
    const riveBox = rive.container.querySelector(".mochit > div");
    expect(riveBox?.className).toContain("h-60 w-60");
    expect(riveBox?.className).toBe(fallbackClass);
  });

  it("disables CSS animation classes when reduced motion is requested", () => {
    render(<Mochit state="happy" animation="bounce" reducedMotion rendererOverride="fallback" />);
    const img = screen.getByRole("img", { name: "よろこぶモチット" });
    expect(img.className).not.toContain("mochit-bounce");
  });

  it("fires the mapped state-machine trigger for a semantic event and drops lower-priority ones", async () => {
    const { rerender } = render(<Mochit state="normal" rendererOverride="rive" event={null} />);
    await screen.findByTestId("mochit-rive");
    rerender(<Mochit state="normal" rendererOverride="rive" event={{ type: "checkpointClear", id: 1 }} />);
    await waitFor(() => {
      expect(firedTriggers.current).toContain("triggerCheckpointClear");
    });
    // 高優先度反応中の低優先度イベントは破棄される
    rerender(<Mochit state="normal" rendererOverride="rive" event={{ type: "tap", id: 2 }} />);
    expect(firedTriggers.current).not.toContain("triggerTap");
  });
});
