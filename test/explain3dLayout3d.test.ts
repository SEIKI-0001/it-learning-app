import { describe, expect, it } from "vitest";
import { FIXTURE_QR, FIXTURE_SSO, FIXTURE_WEB } from "@/lib/ai/explain3dFixtures";
import { EXISTING_MODELS } from "@/lib/explain3d/catalog";
import { KIT_PARTS, KIT_ZONES } from "@/lib/explain3d/kit";
import { labelAt, layoutScene, movePath3D, overviewShot, stepShot } from "@/lib/explain3d/layout3d";
import { parseExplainOutput, parseGeneratedScene } from "@/lib/explain3d/sceneSpec";
import { ACTOR_KINDS, ITEM_KINDS, PLACES, type GeneratedScene } from "@/lib/explain3d/types";

const opts = { existingTopicIds: new Set(EXISTING_MODELS.map((m) => m.topicId)), knownTopicIds: new Set(["tech-http-https", "tech-auth-authz-mfa", "strat-ebusiness"]) };
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const base = (actors: unknown[], steps?: unknown[]) => ({
  title: "テスト",
  summary: "",
  actors,
  steps: steps ?? [
    { title: "1", caption: "動く", tone: "info", active: [], alert: [], move: { from: "a", to: "b", item: "parcel", tag: "x" } },
    { title: "2", caption: "終わり", tone: "ok", active: ["a", "b"], alert: [], move: null },
  ],
});

describe("部品キット", () => {
  it("置ける物・運ぶ物・場所がすべてキットにある", () => {
    for (const k of ACTOR_KINDS) expect(KIT_PARTS[`Kit_${k}`], k).toBeDefined();
    for (const k of ITEM_KINDS) expect(KIT_PARTS[`Item_${k}`], k).toBeDefined();
    for (const p of PLACES) expect(KIT_ZONES[`Zone_${p}`], p).toBeDefined();
  });
});

describe("場所と画面の検証", () => {
  it("場所が無い・知らない場所なら、種類の決まった場所に置く（古い形の JSON も読める）", () => {
    const s = parseGeneratedScene(base([{ id: "a", kind: "pc", name: "PC" }, { id: "b", kind: "server", name: "S", place: "moon" }]))!;
    expect(s.actors.map((a) => a.place)).toEqual(["home", "datacenter"]);
    expect(s.steps.every((st) => st.screen === null)).toBe(true);
  });

  it("場所は最大4つ。5つ目以降の物は、ある場所へ移す", () => {
    const kinds = [["a", "pc", "home"], ["b", "router", "internet"], ["c", "server", "datacenter"], ["d", "store", "town"], ["e", "attacker", "outside"]];
    const steps = kinds.slice(1).map(([id], i) => ({ title: `${i}`, caption: "動く", tone: "info", active: [], alert: [], move: { from: "a", to: id, item: "parcel", tag: "x" } }));
    const s = parseGeneratedScene(base(kinds.map(([id, kind, place]) => ({ id, kind, name: id, place })), steps))!;
    expect(new Set(s.actors.map((a) => a.place)).size).toBe(4);
    expect(s.actors.find((a) => a.id === "e")?.place).toBe("home");
  });

  it("画面は画面のある物だけ・16文字まで", () => {
    const steps = [
      { title: "1", caption: "画面", tone: "info", active: ["a"], alert: [], move: null, screen: { actor: "a", text: "とても長いログイン画面の文字がここに入る" } },
      { title: "2", caption: "サーバ", tone: "info", active: ["b"], alert: [], move: null, screen: { actor: "b", text: "サーバに画面は無い" } },
    ];
    const s = parseGeneratedScene(base([{ id: "a", kind: "laptop", name: "PC" }, { id: "b", kind: "server", name: "S" }], steps))!;
    expect([...(s.steps[0].screen?.text ?? "")].length).toBe(16);
    expect(s.steps[1].screen).toBeNull();
  });

  it("開発用の場面3つはどれも通る", () => {
    for (const f of [FIXTURE_WEB, FIXTURE_SSO, FIXTURE_QR]) expect(parseExplainOutput(f, opts)?.mode).toBe("generated");
  });
});

const sceneOf = (f: unknown) => {
  const p = parseExplainOutput(f, opts);
  if (p?.mode !== "generated") throw new Error("fixture");
  return p.scene as GeneratedScene;
};

describe("3Dの置き方", () => {
  it("場所は流れの順に左から並び、全体の真ん中が 0", () => {
    const l = layoutScene(sceneOf(FIXTURE_WEB));
    expect(l.zones.map((z) => z.place)).toEqual(["home", "internet", "datacenter"]);
    const xs = l.zones.map((z) => z.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(Math.abs(l.zones[0].x - l.zones[0].w / 2 + l.width / 2)).toBeLessThan(0.002);
  });

  it("物は自分の場所の床の中に収まり、同じ列で重ならない", () => {
    for (const f of [FIXTURE_WEB, FIXTURE_SSO, FIXTURE_QR]) {
      const l = layoutScene(sceneOf(f));
      for (const a of l.actors) {
        const z = l.zones.find((x) => x.place === a.place)!;
        const half = (KIT_PARTS[`Kit_${a.kind}`].w * a.scale) / 2;
        expect(a.pos[0] - half).toBeGreaterThanOrEqual(z.x - z.w / 2 - 0.001);
        expect(a.pos[0] + half).toBeLessThanOrEqual(z.x + z.w / 2 + 0.001);
      }
      const rows = new Map<string, typeof l.actors>();
      for (const a of l.actors) rows.set(`${a.place}${a.pos[2]}`, [...(rows.get(`${a.place}${a.pos[2]}`) ?? []), a]);
      for (const row of rows.values()) {
        row.sort((p, q) => p.pos[0] - q.pos[0]);
        for (let i = 1; i < row.length; i++) {
          const gap = row[i].pos[0] - row[i - 1].pos[0] - (KIT_PARTS[`Kit_${row[i].kind}`].w * row[i].scale + KIT_PARTS[`Kit_${row[i - 1].kind}`].w * row[i - 1].scale) / 2;
          expect(gap).toBeGreaterThan(0);
        }
      }
    }
  });

  it("インターネットの物は、真ん中奥の地球儀の前を避ける", () => {
    const l = layoutScene(sceneOf(FIXTURE_WEB));
    const zone = l.zones.find((z) => z.place === "internet")!;
    const isp = l.actors.find((a) => a.id === "isp")!;
    expect(Math.abs(isp.pos[0] - zone.x)).toBeGreaterThan(0.08);
  });

  it("隣と近い名札は互い違いに持ち上げる", () => {
    const l = layoutScene(sceneOf(FIXTURE_SSO));
    const servers = l.actors.filter((a) => a.place === "datacenter").sort((a, b) => a.pos[0] - b.pos[0]);
    expect(servers.map((a) => a.labelLift > 0)).toEqual([false, true, false]);
    expect(labelAt(servers[1])[1]).toBeGreaterThan(labelAt(servers[0])[1]);
  });

  it("同じ場所の中はまっすぐ、場所をまたぐときは手前の通路を通る", () => {
    const l = layoutScene(sceneOf(FIXTURE_WEB));
    expect(movePath3D({ from: "pc", to: "wifi", item: "parcel", tag: "x" }, l)).toHaveLength(2);
    const across = movePath3D({ from: "pc", to: "web", item: "parcel", tag: "x" }, l);
    expect(across).toHaveLength(4);
    expect(across[1][2]).toBe(across[2][2]);
    expect(across[1][2]).toBeGreaterThan(across[0][2]);
  });

  it("1つの物に寄るコマは、全体より近くから見る。縦長の枠は真上寄り", () => {
    const s = sceneOf(FIXTURE_QR);
    const l = layoutScene(s);
    const wide = overviewShot(l, false);
    const close = stepShot(s.steps[2], l, false);
    expect(dist(close.pos, close.look)).toBeLessThan(dist(wide.pos, wide.look));
    const sq = overviewShot(l, true);
    expect(sq.pos[1] - sq.look[1]).toBeGreaterThan(sq.pos[2] - sq.look[2]);
  });
});
