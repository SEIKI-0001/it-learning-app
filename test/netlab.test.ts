import { describe, expect, it } from "vitest";
import {
  canConnect,
  connect,
  initialState,
  place,
  runTest,
  simulate,
  TESTS,
  type LabState,
} from "@/lib/netlab/engine";
import { MISSIONS, missionDone } from "@/lib/netlab/missions";

const solveUpTo = (n: number) => MISSIONS.slice(0, n).reduce<LabState>((s, m) => m.solve(s), initialState());

describe("netlab: ミッションの完成形", () => {
  it("答えを順に当てると、どのミッションもその時点で達成になる", () => {
    let s = initialState();
    for (const m of MISSIONS) {
      expect(missionDone(m, s)).toBe(false);
      s = m.solve(s);
      const failed = m.checks(s).filter((c) => !c.ok).map((c) => c.label);
      expect(failed, m.id).toEqual([]);
    }
    // 最後まで作ると、前のミッションも壊れていない
    for (const m of MISSIONS) expect(missionDone(m, s), m.id).toBe(true);
    for (const t of TESTS) expect(runTest(s, t.id).ok, t.id).toBe(true);
  });
});

describe("netlab: つまずきの再現", () => {
  it("スイッチだけでは IP がなく ping できない", () => {
    const s = solveUpTo(1);
    const r = runTest(s, "ping-ab");
    expect(r.ok).toBe(false);
    expect(r.summary).toContain("IP アドレスを配る機器");
  });

  it("DHCP を切ったままでは IP をもらえない", () => {
    let s = solveUpTo(1);
    s = connect(place(s, "router", "s2"), "router", "switch");
    expect(simulate(s).hosts["pc-a"]?.problem).toContain("DHCP が無効");
  });

  it("DNS がないと Web は名前解決で止まり、経路はルータで止まる", () => {
    const s = { ...solveUpTo(3), router: { ...solveUpTo(3).router, dns: "" as const } };
    const r = runTest(s, "web-pc");
    expect(r.ok).toBe(false);
    expect(r.summary).toContain("DNS");
    expect(r.path.at(-1)).toBe("router");
  });

  it("ファイルサーバの初期 IP（配布範囲の先頭）は PC-A と重複する", () => {
    let s = solveUpTo(3);
    s = connect(place(s, "fileServer", "s5"), "fileServer", "switch");
    const sim = simulate(s);
    expect(sim.hosts["pc-a"]?.ip).toBe("192.168.1.100");
    expect(sim.hosts.fileServer?.conflict).toBe(true);
    expect(runTest(s, "ping-file").ok).toBe(false);
  });

  it("暗号化なしの AP は部外者が入れる", () => {
    const s = { ...solveUpTo(5), ap: { ssid: "X", security: "none" as const } };
    const r = runTest(s, "outsider-wifi");
    expect(r.ok).toBe(false);
    expect(r.reached).toBe(true);
  });

  it("DMZ で全ポートを許可すると SSH が届いてしまう", () => {
    const s = solveUpTo(6);
    const open = { ...s, firewall: { ...s.firewall, inOther: true } };
    expect(runTest(open, "attack-ssh").ok).toBe(false);
    expect(runTest(open, "customer-web").ok).toBe(true);
  });

  it("Web サーバを社内 LAN に置くと外から見られない", () => {
    let s = solveUpTo(5);
    s = connect(place(s, "webServer", "s3"), "webServer", "switch");
    const r = runTest(s, "customer-web");
    expect(r.ok).toBe(false);
    expect(r.summary).toContain("DMZ");
  });
});

describe("netlab: 配線のルール", () => {
  it("PC 同士の直結・ノートPCの有線・ポートの使いすぎを断る", () => {
    let s = initialState();
    expect(canConnect(s, "pc-a", "pc-b").ok).toBe(false);
    s = place(s, "switch", "s4");
    expect(canConnect(s, "laptop", "switch").ok).toBe(false);
    s = place(s, "router", "s2");
    s = connect(s, "router", "switch");
    s = place(s, "fileServer", "s5");
    // ルータの LAN 口は1つだけ
    expect(canConnect(s, "router", "fileServer").ok).toBe(false);
    // ルータの WAN 口はまだ空いている
    expect(canConnect(s, "router", "onu")).toMatchObject({ ok: true, roleA: "wan" });
  });
});
