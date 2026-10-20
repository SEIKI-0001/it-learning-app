import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTopic } from "@/lib/content";
import { EXISTING_MODELS, matchExistingModel } from "@/lib/explain3d/catalog";
import { WORLD, movePath, placeActors, stepCamera } from "@/lib/explain3d/layout";
import { parseExplainOutput, parseGeneratedScene } from "@/lib/explain3d/sceneSpec";
import { DEV_STUB_OUTPUT } from "@/lib/ai/explain3d";

const existingTopicIds = new Set(EXISTING_MODELS.map((m) => m.topicId));
const knownTopicIds = new Set(["tech-http-https", "tech-api"]);

const scene = (overrides: Record<string, unknown> = {}) => ({
  title: "Webページの表示",
  summary: "要点",
  actors: [
    { id: "pc", kind: "laptop", name: "ノートPC" },
    { id: "router", kind: "wifi", name: "Wi-Fi" },
    { id: "web", kind: "server", name: "Webサーバ" },
  ],
  steps: [
    { title: "頼む", caption: "PCがページを頼む", tone: "info", active: ["pc"], alert: [], move: { from: "pc", to: "web", item: "parcel", tag: "リクエスト" } },
    { title: "中継", caption: "Wi-Fiを通って届く", tone: "info", active: ["router"], alert: [], move: null },
    { title: "表示", caption: "ページが表示される", tone: "ok", active: ["pc"], alert: [], move: null },
  ],
  ...overrides,
});

describe("既存の模型の一覧", () => {
  it("どのテーマも実在し、画面側の読み込み先と一致する", () => {
    for (const m of EXISTING_MODELS) expect(getTopic(m.topicId), m.topicId).toBeDefined();
    const views = readFileSync("components/explain3d/existingModels.tsx", "utf8");
    const viewIds = [...views.matchAll(/^\s+"([\w-]+)": dynamic/gm)].map((x) => x[1]);
    expect(new Set(viewIds)).toEqual(existingTopicIds);
  });

  it("キーワードで模型を探す（短い英字は単語として見る）", () => {
    expect(matchExistingModel("DNSの仕組みを教えて")?.topicId).toBe("tech-network-address");
    expect(matchExistingModel("VPNってどうなってるの")?.topicId).toBe("tech-firewall-vpn-zero-trust");
    expect(matchExistingModel("メールが届く仕組み")?.topicId).toBe("tech-email-protocol");
    // 「CA」は「CASE」の一部として数えない
    expect(matchExistingModel("CASEツールとは")).toBeNull();
    expect(matchExistingModel("今日の天気")).toBeNull();
  });
});

describe("AI の出力を整える", () => {
  it("既存の模型：一覧に無いテーマは使わない", () => {
    expect(parseExplainOutput({ mode: "existing", topicId: "tech-api", reason: "API" }, { existingTopicIds, knownTopicIds })).toEqual({
      mode: "existing",
      topicId: "tech-api",
      reason: "API",
    });
    expect(parseExplainOutput({ mode: "existing", topicId: "tech-swot" }, { existingTopicIds, knownTopicIds })).toBeNull();
    expect(parseExplainOutput({ mode: "off_topic" }, { existingTopicIds, knownTopicIds })).toEqual({ mode: "off_topic" });
    expect(parseExplainOutput({ mode: "draw_anything" }, { existingTopicIds, knownTopicIds })).toBeNull();
  });

  it("知らない部品・知らない id の動き・出番の無い物は捨てる", () => {
    const parsed = parseGeneratedScene(
      scene({
        actors: [
          { id: "pc", kind: "laptop", name: "ノートPC" },
          { id: "ufo", kind: "spaceship", name: "UFO" },
          { id: "web", kind: "server", name: "Webサーバ" },
          { id: "idle", kind: "database", name: "使わないDB" },
        ],
        steps: [
          { title: "頼む", caption: "PCがページを頼む", tone: "info", active: [], move: { from: "pc", to: "web", item: "rocket", tag: "リクエスト" } },
          { title: "謎", caption: "UFOが来る", tone: "weird", active: ["ufo"], alert: [], move: { from: "ufo", to: "web" } },
        ],
      }),
    );
    expect(parsed?.actors.map((a) => a.id)).toEqual(["pc", "web"]);
    expect(parsed?.steps[0].move).toMatchObject({ from: "pc", to: "web", item: "parcel" });
    // 光らせる物が無ければ受け取る側を光らせる
    expect(parsed?.steps[0].active).toEqual(["web"]);
    expect(parsed?.steps[1]).toMatchObject({ tone: "info", move: null, active: [] });
  });

  it("文は切り詰め、山括弧や改行を落とす", () => {
    const parsed = parseGeneratedScene(scene({ title: "<script>alert(1)</script>\nとても長いタイトルがここに入りますよ本当に長い" }));
    expect(parsed?.title).not.toMatch(/[<>\n]/);
    expect([...(parsed?.title ?? "")].length).toBeLessThanOrEqual(24);
  });

  it("描けるだけの中身が無ければ null", () => {
    expect(parseGeneratedScene(scene({ actors: [{ id: "pc", kind: "pc", name: "PC" }] }))).toBeNull();
    expect(parseGeneratedScene(scene({ steps: [scene().steps[0]] }))).toBeNull();
    expect(parseGeneratedScene(scene({ title: "" }))).toBeNull();
  });

  it("開発用の固定の場面もそのまま通る", () => {
    const parsed = parseExplainOutput(DEV_STUB_OUTPUT, { existingTopicIds, knownTopicIds });
    expect(parsed?.mode).toBe("generated");
  });
});

describe("置き方とカメラ", () => {
  const parsed = parseGeneratedScene(scene())!;
  const placed = placeActors(parsed);

  it("流れの順に左から右へ、舞台の中に並べる", () => {
    const xs = placed.map((a) => a.at.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    for (const a of placed) {
      expect(a.at.x).toBeGreaterThan(0);
      expect(a.at.x).toBeLessThan(WORLD.w);
    }
  });

  it("離れた物どうしは手前の通路を回る", () => {
    const path = movePath(parsed.steps[0].move!, placed);
    expect(path).toHaveLength(4);
    expect(Math.max(...path.map((p) => p.y))).toBeGreaterThan(placed[1].at.y);
    const near = movePath({ from: "pc", to: "router", item: "parcel", tag: "x" }, placed);
    expect(near).toHaveLength(2);
  });

  it("動きの両端が入るようにカメラを引き、1つだけなら寄る", () => {
    const wide = stepCamera(parsed.steps[0], placed);
    const close = stepCamera(parsed.steps[1], placed);
    expect(wide.zoom).toBeLessThan(close.zoom);
    expect(close.fx).toBe(placed[1].at.x);
  });
});
