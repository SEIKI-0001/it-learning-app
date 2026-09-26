// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setUserId } from "@/lib/userSession";
import {
  loadTodayActivityLog,
  markTodayActivityDone,
  rememberDrillQuestions,
  rememberOfferedActivities,
} from "@/lib/todayActivityLog";
import { fetchRemoteActivities, offerRemoteActivities } from "@/lib/todayActivitySync";
import { kakomonActivityFromSpec } from "@/lib/todayKakomon";

const DATE = "2026-09-26";
const drill = kakomonActivityFromSpec({
  kind: "past_exam_drill", stage: "field-drill", field: "technology", count: 12, answered: 0, reason: "cp5_field",
});

function installMemoryStorage(): void {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
      clear: () => values.clear(),
      key: (i: number) => [...values.keys()][i] ?? null,
      get length() {
        return values.size;
      },
    },
  });
}

describe("Today のタスクの端末キャッシュとサーバ同期", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    installMemoryStorage();
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ ok: true, activities: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("学習先で終えたら端末に完了を残し、サーバへ completed を送る", async () => {
    setUserId("user-a");
    rememberOfferedActivities([drill], DATE);
    markTodayActivityDone(drill.id, DATE);
    expect(Object.keys(loadTodayActivityLog(DATE).done)).toEqual([drill.id]);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toMatchObject({ action: "complete", date: DATE, key: "act:past-exam" });
    expect(body.activity.payload).toMatchObject({ v: 1, kind: "past_exam_drill", field: "technology" });
  });

  it("Today から来ていない・出していないタスクは完了にしない", () => {
    setUserId("user-a");
    markTodayActivityDone(null, DATE);
    markTodayActivityDone("act:vocab", DATE);
    expect(loadTodayActivityLog(DATE).done).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("API が失敗・未ログインなら null（端末キャッシュで続ける）", async () => {
    setUserId("user-a");
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    await expect(fetchRemoteActivities(DATE)).resolves.toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(offerRemoteActivities(DATE, [drill])).resolves.toBeNull();
    window.localStorage.clear();
    fetchMock.mockClear();
    await expect(fetchRemoteActivities(DATE)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("部分演習で決まった問題はタスクの中身とリンクに残る", () => {
    rememberOfferedActivities([drill], DATE);
    rememberDrillQuestions(drill.id, ["ipa-it-passport-2026-q060"], DATE);
    const saved = loadTodayActivityLog(DATE).offered[drill.id];
    expect(saved.spec).toMatchObject({ questionIds: ["ipa-it-passport-2026-q060"] });
    expect(saved.href).toContain("ids=ipa-it-passport-2026-q060");
  });
});
