// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestMochitChat: vi.fn(),
  trackMochitEvent: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/today" }));
vi.mock("@/lib/mochitAi/client", () => ({
  requestMochitChat: mocks.requestMochitChat,
  trackMochitEvent: mocks.trackMochitEvent,
}));

import MochitConsultSheet from "@/components/mochit/MochitConsultSheet";
import { closeMochitConsult, openMochitConsult, resetMochitConsultStoreForTest } from "@/components/mochit/mochitConsultStore";
import { joinTranscripts, resetMochitVoiceForTest, toSpeakableText } from "@/components/mochit/useMochitVoice";

const storage = new Map<string, string>();

class FakeRecognition {
  static last: FakeRecognition | null = null;
  // iPhone で終わりの合図（onend）が来ないまま止まる状況を再現する
  static silentEnd = false;
  lang = "";
  interimResults = false;
  continuous = false;
  maxAlternatives = 1;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => {
    FakeRecognition.last = this;
  });
  stop = vi.fn(() => {
    if (!FakeRecognition.silentEnd) this.onend?.();
  });
  abort = vi.fn(() => {
    if (!FakeRecognition.silentEnd) this.onend?.();
  });
  hear(transcript: string, isFinal: boolean) {
    const result = Object.assign([{ transcript }], { isFinal });
    this.onresult?.({ resultIndex: 0, results: [result] });
  }
}

class FakeUtterance {
  lang = "";
  voice: unknown = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

const synth = {
  speaking: false,
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: () => [{ lang: "ja-JP", localService: true, name: "Kyoko" }],
};

function spokenTexts() {
  return synth.speak.mock.calls.map(([u]) => (u as FakeUtterance).text).filter(Boolean);
}

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, String(v)),
      removeItem: (k: string) => void storage.delete(k),
      clear: () => storage.clear(),
    },
  });
  Element.prototype.scrollTo = () => {};
});

beforeEach(() => {
  mocks.requestMochitChat.mockResolvedValue({ ok: true, reply: "今日はあと**2つ**だよ。", intent: "today" });
  Object.assign(window, { webkitSpeechRecognition: FakeRecognition, speechSynthesis: synth });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
});

afterEach(() => {
  cleanup();
  resetMochitConsultStoreForTest();
  resetMochitVoiceForTest();
  storage.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  const w = window as unknown as Record<string, unknown>;
  delete w.webkitSpeechRecognition;
  delete w.speechSynthesis;
  FakeRecognition.last = null;
  FakeRecognition.silentEnd = false;
  vi.useRealTimers();
});

function openSheet() {
  render(<MochitConsultSheet displayName="モチット" />);
  act(() => openMochitConsult());
}

describe("モチット相談の音声", () => {
  it("話した内容を入力欄に入れるだけで、送信は自分で押す", async () => {
    openSheet();
    fireEvent.click(await screen.findByRole("button", { name: "声で話しかける" }));
    const recognition = FakeRecognition.last!;
    expect(recognition.lang).toBe("ja-JP");
    expect(screen.getByText(/聞いてるよ/)).toBeInTheDocument();

    act(() => recognition.hear("稼働率の計算", false));
    act(() => recognition.hear("稼働率の計算がわからない", true));
    act(() => recognition.onend?.());
    expect(screen.getByLabelText("モチットに聞く")).toHaveValue("稼働率の計算がわからない");
    expect(mocks.requestMochitChat).not.toHaveBeenCalled();
  });

  it("マイクが許可されていなければ、理由を伝えて文字入力はそのまま使える", async () => {
    openSheet();
    fireEvent.click(await screen.findByRole("button", { name: "声で話しかける" }));
    act(() => FakeRecognition.last!.onerror?.({ error: "not-allowed" }));
    act(() => FakeRecognition.last!.onend?.());
    expect(screen.getByText(/マイクの使用が許可されていない/)).toBeInTheDocument();
    expect(screen.getByLabelText("モチットに聞く")).toBeEnabled();
  });

  it("読み上げは既定でオフ。オンにすると返事を記号抜きで読み、設定を覚える", async () => {
    openSheet();
    const toggle = await screen.findByRole("button", { name: "返事を声で読み上げる" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "今日あと何をすればいい？" }));
    await screen.findByText("今日はあと**2つ**だよ。");
    expect(spokenTexts()).toEqual([]);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(storage.get("fequest:mochitSpeak:v1")).toBe("1");

    const input = screen.getByLabelText("モチットに聞く");
    fireEvent.change(input, { target: { value: "ありがとう" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await vi.waitFor(() => expect(spokenTexts()).toContain("今日はあと2つだよ。"));
    const utterance = synth.speak.mock.calls.at(-1)![0] as FakeUtterance;
    expect(utterance.lang).toBe("ja-JP");
  });

  it("閉じたら読み上げを止める", async () => {
    storage.set("fequest:mochitSpeak:v1", "1");
    openSheet();
    expect(await screen.findByRole("button", { name: "返事を声で読み上げる" })).toHaveAttribute("aria-pressed", "true");
    synth.cancel.mockClear();
    act(() => closeMochitConsult());
    expect(synth.cancel).toHaveBeenCalled();
  });

  it("音声に対応していないブラウザではボタンを出さない", async () => {
    const w = window as unknown as Record<string, unknown>;
    delete w.webkitSpeechRecognition;
    delete w.speechSynthesis;
    openSheet();
    await screen.findByLabelText("モチットに聞く");
    expect(screen.queryByRole("button", { name: "声で話しかける" })).toBeNull();
    expect(screen.queryByRole("button", { name: "返事を声で読み上げる" })).toBeNull();
  });
});

describe("iPhone の不安定な音声入力", () => {
  it("終わりの合図が来なくても、止めたあとは聞き取り中のまま固まらず、もう一度押せる", async () => {
    FakeRecognition.silentEnd = true;
    openSheet();
    fireEvent.click(await screen.findByRole("button", { name: "声で話しかける" }));
    vi.useFakeTimers();
    act(() => FakeRecognition.last!.hear("ネットワーク", false));
    fireEvent.click(screen.getByRole("button", { name: "音声入力を止める" }));
    act(() => vi.advanceTimersByTime(1_600));
    const mic = screen.getByRole("button", { name: "声で話しかける" });
    expect(screen.getByLabelText("モチットに聞く")).toHaveValue("ネットワーク");

    const first = FakeRecognition.last;
    fireEvent.click(mic);
    expect(FakeRecognition.last).not.toBe(first);
    expect(FakeRecognition.last!.start).toHaveBeenCalled();
  });

  it("話し始めないまま放置しても、上限時間で聞き取りを畳む", async () => {
    FakeRecognition.silentEnd = true;
    openSheet();
    const mic = await screen.findByRole("button", { name: "声で話しかける" });
    vi.useFakeTimers();
    fireEvent.click(mic);
    expect(screen.getByRole("button", { name: "音声入力を止める" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(17_000));
    expect(screen.getByRole("button", { name: "声で話しかける" })).toBeInTheDocument();
  });

  it("何も聞き取れずに終わったら、黙って消えずにもう一度話すよう伝える", async () => {
    openSheet();
    fireEvent.click(await screen.findByRole("button", { name: "声で話しかける" }));
    act(() => FakeRecognition.last!.onend?.());
    expect(screen.getByText(/うまく聞き取れなかったよ/)).toBeInTheDocument();
  });

  it("聞き取りを始めるときは読み上げを止める（自分の声を拾わない）", async () => {
    openSheet();
    synth.cancel.mockClear();
    fireEvent.click(await screen.findByRole("button", { name: "声で話しかける" }));
    expect(synth.cancel).toHaveBeenCalled();
  });

  it("途中までの文を重ねて返されても二重にしない", () => {
    expect(joinTranscripts(["稼働率", "稼働率の計算"])).toBe("稼働率の計算");
    expect(joinTranscripts(["稼働率の", "計算"])).toBe("稼働率の計算");
  });
});

describe("toSpeakableText", () => {
  it("強調記号や絵文字を落とす", () => {
    expect(toSpeakableText("**ポイント**は2つ✨\n- 稼働率")).toBe("ポイントは2つ - 稼働率");
  });
});
