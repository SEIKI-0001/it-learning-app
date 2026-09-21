// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicKeyExperience from "@/components/experiences/PublicKeyExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <PublicKeyExperience />
    </ExperienceSlideDeck>,
  );
}

function renderFlow() {
  renderDeck();
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

function scene() {
  return screen.getByTestId("crypto-scene");
}

function keySpot(kind: "public" | "private") {
  return scene().querySelector(`[data-key="${kind}"]`)?.getAttribute("data-spot");
}

function capsuleState() {
  // 第三者が持つコピー（吹き出し内）ではなく、レーン上のカプセルを見る
  const main = scene().querySelector('[role="img"][data-capsule-state]');
  return main?.getAttribute("data-capsule-state") ?? null;
}

function laneState(id: "key" | "data") {
  return scene().querySelector(`[data-lane="${id}"]`)?.getAttribute("data-rail-state");
}

function next() {
  fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: matches && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("PublicKeyExperience", () => {
  it("keeps the three-slide structure: key roles → two-phase flow → comparison", () => {
    renderDeck();

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "12つの鍵（ペアで使う）" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "2送信の流れ（2段階：鍵を配る → 暗号通信）" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3共通鍵方式とのちがい" })).toBeInTheDocument();
    for (const row of ["鍵の数", "暗号化／復号", "鍵を配る悩み", "速さ"]) {
      expect(screen.getByRole("cell", { name: row })).toBeInTheDocument();
    }
    expect(screen.getByText(/秘密鍵で署名し公開鍵で確認/)).toBeInTheDocument();
  });

  it("distributes only the public key on slide 1 and keeps the private key with B", () => {
    renderDeck();

    expect(screen.getByTestId("key-stage")).toHaveAttribute("data-shared", "false");
    fireEvent.click(screen.getByRole("button", { name: "公開鍵を配ってみる" }));
    expect(screen.getByTestId("key-stage")).toHaveAttribute("data-shared", "true");
    expect(screen.getByTestId("stage-public-key")).toHaveAttribute("data-spot", "shared");
    expect(screen.getByTestId("stage-private-key")).toHaveAttribute("data-spot", "owner");

    fireEvent.click(screen.getByRole("button", { name: "秘密鍵も配る？" }));
    expect(screen.getByRole("status")).toHaveTextContent("秘密鍵は配らない");
    expect(screen.getByTestId("stage-private-key")).toHaveAttribute("data-spot", "owner");
  });

  it("renders A, B and the eavesdropper with two distinct key objects", () => {
    renderFlow();

    expect(scene().querySelector('[data-illustration="person-A"]')).not.toBeNull();
    expect(scene().querySelector('[data-illustration="person-B"]')).not.toBeNull();
    expect(scene().querySelector('[data-illustration="eavesdropper"]')).not.toBeNull();
    expect(within(scene()).getByRole("img", { name: "Bの公開鍵" })).toHaveTextContent("PUBLIC");
    expect(within(scene()).getByRole("img", { name: "Bの秘密鍵" })).toHaveTextContent("PRIVATE");
    expect(scene().querySelectorAll("[data-lane]")).toHaveLength(2);
  });

  it("phase 1 moves only the public key from B to A", () => {
    renderFlow();

    expect(screen.getByTestId("crypto-phase")).toHaveAttribute("data-phase", "1");
    expect(keySpot("public")).toBe("bHome");
    expect(keySpot("private")).toBe("bHome");
    expect(capsuleState()).toBeNull();

    next();
    expect(screen.getByTestId("crypto-route")).toHaveTextContent("B → A：公開鍵だけ");
    expect(laneState("key")).toBe("active");
    expect(laneState("data")).toBe("idle");
    expect(keySpot("public")).toBe("aHome");
    // 秘密鍵はレーンに乗らず B の手元に残る
    expect(keySpot("private")).toBe("bHome");
    expect(capsuleState()).toBeNull();
  });

  it("phase 2 encrypts with the public key, sends A → B and decrypts with B's private key", () => {
    renderFlow();
    next();

    next();
    expect(screen.getByTestId("crypto-phase")).toHaveAttribute("data-phase", "2");
    expect(capsuleState()).toBe("plain");
    expect(within(scene()).getByRole("img", { name: /平文のメッセージ/ })).toHaveTextContent("会議は10時");

    next();
    expect(screen.getByTestId("crypto-step-title")).toHaveTextContent("公開鍵で暗号化");
    expect(capsuleState()).toBe("encrypted");
    expect(keySpot("public")).toBe("aUse");
    expect(within(scene()).getByRole("img", { name: "暗号化されたメッセージ" })).toHaveTextContent(
      "ENCRYPTED DATA",
    );

    next();
    expect(screen.getByTestId("crypto-route")).toHaveTextContent("A → B：暗号文");
    expect(laneState("data")).toBe("active");
    expect(laneState("key")).toBe("done");
    expect(capsuleState()).toBe("encrypted");
    const eve = screen.getByTestId("eve-callout");
    expect(eve).toHaveTextContent("暗号文は見える");
    expect(eve).toHaveTextContent("公開鍵では開かない");
    expect(eve).toHaveTextContent("秘密鍵を持っていない");
    expect(keySpot("private")).toBe("bHome");

    next();
    expect(screen.getByTestId("crypto-step-title")).toHaveTextContent("Bが秘密鍵で復号");
    expect(capsuleState()).toBe("decrypted");
    expect(keySpot("private")).toBe("bUse");
    expect(within(scene()).getByRole("img", { name: /復号されたメッセージ/ })).toHaveTextContent("会議は10時");
    expect(screen.queryByTestId("eve-callout")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1ステップ進む" })).toBeDisabled();
  });

  it("scrubs the timeline and steps backwards", () => {
    renderFlow();

    fireEvent.change(screen.getByRole("slider", { name: "暗号通信のタイムライン" }), {
      target: { value: "4" },
    });
    expect(screen.getByTestId("crypto-step-title")).toHaveTextContent("暗号文をBへ送信");

    fireEvent.click(screen.getByRole("button", { name: "1ステップ戻る" }));
    expect(screen.getByTestId("crypto-step-title")).toHaveTextContent("公開鍵で暗号化");

    fireEvent.click(screen.getByRole("button", { name: "STEP 1：Bが鍵ペアを持つ" }));
    expect(keySpot("public")).toBe("bHome");
  });

  it("autoplays, pauses and resumes", () => {
    vi.useFakeTimers();
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "暗号通信を再生" }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId("crypto-step-title")).toHaveTextContent("公開鍵をAへ渡す");

    fireEvent.click(screen.getByRole("button", { name: "再生を一時停止" }));
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(screen.getByTestId("crypto-step-title")).toHaveTextContent("公開鍵をAへ渡す");

    fireEvent.click(screen.getByRole("button", { name: "暗号通信を再生" }));
    for (let i = 0; i < 4; i += 1) {
      act(() => {
        vi.advanceTimersByTime(3000);
      });
    }
    expect(capsuleState()).toBe("decrypted");
    expect(screen.getByRole("button", { name: "暗号通信を再生" })).toBeInTheDocument();
  });

  it("decrypts only with B's private key in the which-key check", () => {
    renderFlow();
    const check = screen.getByTestId("which-key");
    const capsule = () => check.querySelector("[data-capsule-state]")?.getAttribute("data-capsule-state");

    expect(capsule()).toBe("encrypted");

    fireEvent.click(within(check).getByRole("button", { name: /Bの公開鍵/ }));
    expect(capsule()).toBe("failed");
    expect(within(check).getByTestId("which-key-result")).toHaveTextContent("復号失敗");

    fireEvent.click(within(check).getByRole("button", { name: /Bの秘密鍵/ }));
    expect(capsule()).toBe("decrypted");
    expect(within(check).getByTestId("which-key-result")).toHaveTextContent("復号成功");
    expect(check).toHaveTextContent("会議は10時");
  });

  it("stays fully operable with reduced motion", () => {
    stubReducedMotion(true);
    renderFlow();

    expect(scene()).toHaveAttribute("data-reduced-motion", "true");
    expect(screen.getByRole("button", { name: "暗号通信を再生" })).toBeDisabled();

    next();
    expect(keySpot("public")).toBe("aHome");
    next();
    next();
    expect(capsuleState()).toBe("encrypted");

    fireEvent.change(screen.getByRole("slider", { name: "暗号通信のタイムライン" }), {
      target: { value: "5" },
    });
    expect(capsuleState()).toBe("decrypted");
    expect(keySpot("private")).toBe("bUse");

    fireEvent.click(screen.getByRole("button", { name: /Bの秘密鍵/ }));
    expect(screen.getByTestId("which-key-result")).toHaveTextContent("復号成功");
  });
});
