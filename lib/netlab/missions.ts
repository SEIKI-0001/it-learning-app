import {
  DEVICE_NAME,
  PCS,
  connect,
  disconnect,
  inDhcpRange,
  isPresent,
  neighbors,
  place,
  runTest,
  sameSubnet,
  simulate,
  type DeviceId,
  type LabState,
  type PlaceableKind,
  type TestId,
} from "./engine";
import { SLOTS } from "./layout";

// Missions: build the small company's office in order: LAN → DHCP → Internet → server → Wi-Fi → DMZ.
// Every check is recomputed from the current state (the panel always shows "is it satisfied right now").
// Each check carries a "next action" for that step (it does the step, opens the right setting, or runs the test),
// so the guide can take the user there in one press.

/** A setting to open (the matching inspector field is highlighted) */
export type FocusField =
  | "router.dhcp"
  | "router.range"
  | "router.dns"
  | "router.nat"
  | "file.ip"
  | "ap.security"
  | "fw.rules";

export type CheckAction = {
  /** Button label (e.g. "Place the switch", "Turn on DHCP") */
  label: string;
  /** Do it for the user (place, wire, rewire) */
  run?: (s: LabState) => LabState;
  /** Select this device and highlight the setting (the user toggles it themselves) */
  focus?: { device: DeviceId; field: FocusField };
  /** Run the test (packet animation) */
  test?: TestId;
  /** Name tags to make pulse */
  highlight?: DeviceId[];
};

export type Check = { label: string; ok: boolean; hint?: string; action?: CheckAction };

export type Mission = {
  id: string;
  title: string;
  /** The request (from the boss) */
  story: string;
  /** Terms covered (IT Passport syllabus terms) */
  terms: string[];
  /** Tests that verify this mission */
  tests: TestId[];
  checks: (state: LabState) => Check[];
  /** "Show answer" completes everything up to this mission */
  solve: (state: LabState) => LabState;
};

const linkedTo = (state: LabState, a: DeviceId, b: DeviceId) => neighbors(state, a).includes(b);

/** Preferred place for each device (where "place" drops it). Uses the next free slot if taken */
const PREFERRED_SLOT: Record<PlaceableKind, string[]> = {
  firewall: ["s1", "s2", "s3", "s4", "s5", "s6"],
  router: ["s2", "s1", "s3", "s4", "s5", "s6"],
  webServer: ["s3", "s6", "s2", "s1", "s4", "s5"],
  switch: ["s4", "s5", "s6", "s1", "s2", "s3"],
  fileServer: ["s5", "s6", "s4", "s3", "s2", "s1"],
  ap: ["w1", "w2"],
};

export function freeSlotFor(state: LabState, kind: PlaceableKind): string | null {
  const used = new Set(Object.values(state.placed));
  return PREFERRED_SLOT[kind].find((id) => !used.has(id) && SLOTS.some((s) => s.id === id && s.accepts.includes(kind))) ?? null;
}

/** Place in the preferred slot (no-op if already placed or no room) */
export function autoPlace(state: LabState, kind: PlaceableKind): LabState {
  if (isPresent(state, kind)) return state;
  const slot = freeSlotFor(state, kind);
  return slot ? place(state, kind, slot) : state;
}

const placeAction = (kind: PlaceableKind): CheckAction => ({
  label: `${DEVICE_NAME[kind]}を置く`,
  run: (s) => autoPlace(s, kind),
});

const wireAction = (a: DeviceId, b: DeviceId): CheckAction => ({
  label: `${DEVICE_NAME[a]}と${DEVICE_NAME[b]}をつなぐ`,
  run: (s) => connect(s, a, b),
  highlight: [a, b],
});

/** If not placed yet, place it; otherwise wire it */
const placeThenWire = (s: LabState, kind: PlaceableKind, to: DeviceId): CheckAction =>
  isPresent(s, kind) ? wireAction(kind, to) : placeAction(kind);

const testAction = (id: TestId): CheckAction => ({ label: "テストして確かめる", test: id });

export const MISSIONS: Mission[] = [
  {
    id: "lan",
    title: "1. 社員の PC を LAN でつなぐ",
    story: "4人の社員が、お互いの PC でファイルを渡し合えるようにしてほしい。まずはケーブルでつなごう。",
    terms: ["LAN", "スイッチ（L2スイッチ）", "スター型"],
    tests: ["ping-ab"],
    checks: (s) => {
      const unwired = PCS.filter((pc) => !linkedTo(s, pc, "switch"));
      return [
        {
          label: "スイッチをサーバ室に置く",
          ok: isPresent(s, "switch"),
          hint: "スイッチは、LAN の機器を1か所に集めてつなぐ「たこ足」の役。",
          action: placeAction("switch"),
        },
        {
          label: "PC 4台をスイッチにつなぐ",
          ok: unwired.length === 0,
          hint: "PC の名札からスイッチの名札へドラッグすると1本ずつつなげます。どの PC もスイッチへ1本ずつの「スター型」になります。",
          action: isPresent(s, "switch")
            ? {
                label: unwired.length > 1 ? `残りの PC ${unwired.length}台をまとめてつなぐ` : `${unwired[0]?.toUpperCase()} をつなぐ`,
                run: (t) => unwired.reduce((acc, pc) => connect(acc, pc, "switch"), t),
                highlight: [...unwired, "switch"],
              }
            : placeAction("switch"),
        },
      ];
    },
    solve: (s) => PCS.reduce((acc, pc) => connect(acc, pc, "switch"), autoPlace(s, "switch")),
  },
  {
    id: "dhcp",
    title: "2. IP アドレスを自動で配る",
    story: "ケーブルはつながったのに、PC 同士で通信できない。ネットワークの「住所」＝IP アドレスがないからだ。ルータの DHCP で自動で配ろう。",
    terms: ["IP アドレス", "DHCP", "プライベート IP アドレス", "ping"],
    tests: ["ping-ad"],
    checks: (s) => {
      const sim = simulate(s);
      return [
        { label: "ルータを置く", ok: isPresent(s, "router"), action: placeAction("router") },
        {
          label: "ルータの LAN ポートをスイッチにつなぐ",
          ok: linkedTo(s, "router", "switch"),
          hint: "ルータの LAN 側を社内のスイッチへ。ここが社内の出入口（デフォルトゲートウェイ）になります。",
          action: placeThenWire(s, "router", "switch"),
        },
        {
          label: "ルータの DHCP を有効にする",
          ok: s.router.dhcp && !sim.dhcpProblem,
          hint: sim.dhcpProblem ?? "DHCP サーバは、つながった機器に IP アドレスを自動で貸し出す仕組み。",
          action: isPresent(s, "router")
            ? { label: "ルータの設定を開く", focus: { device: "router", field: sim.dhcpProblem ? "router.range" : "router.dhcp" } }
            : placeAction("router"),
        },
        {
          label: "4台すべてに IP アドレスが配られる",
          ok: PCS.every((pc) => !!sim.hosts[pc]?.ip && !sim.hosts[pc]?.conflict),
          hint: "PC の画面に 192.168.1.x が出れば配られています。",
        },
        { label: "テスト：PC-A → PC-D に ping が届く", ok: runTest(s, "ping-ad", sim).ok, action: testAction("ping-ad") },
      ];
    },
    solve: (s) => {
      const t = connect(autoPlace(s, "router"), "router", "switch");
      return { ...t, router: { ...t.router, dhcp: true } };
    },
  },
  {
    id: "internet",
    title: "3. インターネットにつなぐ",
    story: "社内はつながった。次は取引先のサイトを見たい。光回線の ONU とルータをつなぎ、名前を IP アドレスに変える DNS も設定しよう。",
    terms: ["ONU", "WAN", "デフォルトゲートウェイ", "NAT", "DNS"],
    tests: ["web-pc"],
    checks: (s) => {
      const sim = simulate(s);
      return [
        {
          label: "ルータの WAN ポートを ONU につなぐ",
          ok: sim.routerOnline,
          hint: "ルータの WAN 側は外（インターネット）向き。壁の ONU が光回線の入口です。",
          action: placeThenWire(s, "router", "onu"),
        },
        {
          label: "DNS サーバを設定する",
          ok: s.router.dns !== "",
          hint: "「www.example.com」のような名前を IP アドレスに変える係。ないと名前でサイトを開けません。",
          action: { label: "ルータの設定を開く", focus: { device: "router", field: "router.dns" } },
        },
        {
          label: "NAT を有効にしておく",
          ok: s.router.nat,
          action: { label: "ルータの設定を開く", focus: { device: "router", field: "router.nat" } },
        },
        { label: "テスト：PC-A で Web サイトが見られる", ok: runTest(s, "web-pc", sim).ok, action: testAction("web-pc") },
      ];
    },
    solve: (s) => {
      const t = connect(s, "router", "onu");
      return { ...t, router: { ...t.router, dns: t.router.dns || "router", nat: true } };
    },
  },
  {
    id: "file",
    title: "4. ファイルサーバを置く",
    story: "共有フォルダ用のファイルサーバを入れた。いつも同じ住所で見つかるよう、IP アドレスは手で決めて（固定して）おこう。",
    terms: ["ファイルサーバ", "固定 IP アドレス", "IP アドレスの重複", "サブネット"],
    tests: ["ping-file"],
    checks: (s) => {
      const sim = simulate(s);
      const h = sim.hosts.fileServer;
      const ip = s.fileServer.ip;
      const openIp: CheckAction = isPresent(s, "fileServer")
        ? { label: "IP アドレスを直す", focus: { device: "fileServer", field: "file.ip" } }
        : placeAction("fileServer");
      return [
        {
          label: "ファイルサーバを置いて、スイッチにつなぐ",
          ok: linkedTo(s, "fileServer", "switch"),
          action: placeThenWire(s, "fileServer", "switch"),
        },
        {
          label: "ルータと同じネットワークの IP アドレスにする",
          ok: isPresent(s, "fileServer") && sameSubnet(ip, s.router.lanIp),
          hint: `先頭3つの数字（ネットワーク部）をルータ（${s.router.lanIp}）とそろえます。`,
          action: openIp,
        },
        {
          label: "DHCP の配布範囲と重ならないアドレスにする",
          ok: isPresent(s, "fileServer") && !inDhcpRange(s.router, ip) && !h?.conflict && ip !== s.router.lanIp,
          hint: `配布範囲は ${s.router.dhcpStart} 〜 ${s.router.dhcpEnd}。範囲の外（例：192.168.1.10）にしないと PC と住所がぶつかります。`,
          action: openIp,
        },
        { label: "テスト：PC-C からファイルサーバに届く", ok: runTest(s, "ping-file", sim).ok, action: testAction("ping-file") },
      ];
    },
    solve: (s) => {
      const t = connect(autoPlace(s, "fileServer"), "fileServer", "switch");
      return { ...t, fileServer: { ip: "192.168.1.10" } };
    },
  },
  {
    id: "wifi",
    title: "5. 会議室に Wi-Fi を入れる",
    story: "会議室ではノート PC を無線で使いたい。無線 AP を置こう。ただし、隣のビルの人に勝手に使われないようにすること。",
    terms: ["無線LAN", "アクセスポイント", "SSID", "WPA2 / WPA3"],
    tests: ["web-laptop", "outsider-wifi"],
    checks: (s) => {
      const sim = simulate(s);
      return [
        { label: "無線 AP を置いて、スイッチにつなぐ", ok: linkedTo(s, "ap", "switch"), action: placeThenWire(s, "ap", "switch") },
        {
          label: "暗号化を WPA2 か WPA3 にする",
          ok: isPresent(s, "ap") && s.ap.security !== "none",
          hint: "暗号化なしだと、電波が届く人なら誰でも接続でき、通信も盗み見られます。",
          action: isPresent(s, "ap") ? { label: "AP の設定を開く", focus: { device: "ap", field: "ap.security" } } : placeAction("ap"),
        },
        { label: "テスト：ノート PC で Web サイトが見られる", ok: runTest(s, "web-laptop", sim).ok, action: testAction("web-laptop") },
        {
          label: "テスト：近所の人は接続できない",
          ok: isPresent(s, "ap") && runTest(s, "outsider-wifi", sim).ok,
          action: testAction("outsider-wifi"),
        },
      ];
    },
    solve: (s) => {
      const t = connect(autoPlace(s, "ap"), "ap", "switch");
      return { ...t, ap: { ...t.ap, security: "wpa3" } };
    },
  },
  {
    id: "dmz",
    title: "6. 自社サイトを安全に公開する",
    story: "会社の Web サイトを自前のサーバで公開したい。外から見られる場所（DMZ）を作り、社内 LAN は守ったままにしよう。",
    terms: ["ファイアウォール", "DMZ", "ポート番号（443 / 22）", "パケットフィルタリング"],
    tests: ["customer-web", "attack-ssh", "attack-file", "web-pc"],
    checks: (s) => {
      const sim = simulate(s);
      // Rewire: place the firewall → unplug router⇔ONU → ONU⇔firewall → firewall⇔router (proceed one step at a time)
      const rewire: CheckAction = !isPresent(s, "firewall")
        ? placeAction("firewall")
        : linkedTo(s, "router", "onu")
          ? { label: "ルータ⇔ONU のケーブルを外す", run: (t) => disconnect(t, "router", "onu"), highlight: ["router", "onu"] }
          : !linkedTo(s, "onu", "firewall")
            ? wireAction("onu", "firewall")
            : wireAction("firewall", "router");
      const webWire: CheckAction = !isPresent(s, "webServer")
        ? placeAction("webServer")
        : {
            label: "Webサーバを DMZ ポートにつなぐ",
            run: (t) => connect({ ...t, links: t.links.filter((l) => l.a !== "webServer" && l.b !== "webServer") }, "firewall", "webServer"),
            highlight: ["firewall", "webServer"],
          };
      const rules: CheckAction = { label: "ファイアウォールのルールを開く", focus: { device: "firewall", field: "fw.rules" } };
      return [
        {
          label: "ONU → ファイアウォール → ルータ の順につなぎ直す",
          ok: sim.routerVia === "firewall",
          hint: "外からの通信は、必ずファイアウォールを通ってから社内へ入るようにします。",
          action: rewire,
        },
        {
          label: "Web サーバをファイアウォールの DMZ ポートにつなぐ",
          ok: sim.webServerZone === "dmz",
          hint: "DMZ は、外にも内にも直接つながない「緩衝地帯」。公開するサーバだけを置きます。",
          action: isPresent(s, "firewall") ? webWire : placeAction("firewall"),
        },
        { label: "ファイルサーバは社内 LAN に置いたまま", ok: sim.fileServerZone === "lan" },
        {
          label: "テスト：お客さんが自社サイトを見られる",
          ok: runTest(s, "customer-web", sim).ok,
          hint: "HTTPS は 443 番ポート。ここだけを外から許可します。",
          action: sim.firewallOnline && sim.webServerZone === "dmz" && !s.firewall.inHttps && !s.firewall.inOther ? rules : testAction("customer-web"),
        },
        {
          label: "テスト：攻撃者の SSH（22）を止める",
          ok: sim.webServerZone !== null && runTest(s, "attack-ssh", sim).ok,
          hint: "許可するのは必要なポート（443）だけ。全部開けると管理用の口まで外から触れます。",
          action: s.firewall.inOther ? rules : testAction("attack-ssh"),
        },
        { label: "テスト：攻撃者はファイルサーバに届かない", ok: runTest(s, "attack-file", sim).ok, action: testAction("attack-file") },
        { label: "テスト：社員は今まで通り Web を見られる", ok: runTest(s, "web-pc", sim).ok, action: testAction("web-pc") },
      ];
    },
    solve: (s) => {
      let t = autoPlace(autoPlace(s, "firewall"), "webServer");
      // Unplug the direct router⇔ONU link and the web server's LAN-side cable, then rewire
      t = disconnect(t, "router", "onu");
      t = { ...t, links: t.links.filter((l) => l.a !== "webServer" && l.b !== "webServer") };
      t = connect(t, "onu", "firewall");
      t = connect(t, "firewall", "router");
      t = connect(t, "firewall", "webServer");
      return { ...t, firewall: { outbound: true, inHttps: true, inOther: false } };
    },
  },
];

export const missionDone = (m: Mission, s: LabState) => m.checks(s).every((c) => c.ok);

/** The next step to do in the mission (the first unmet check) */
export const nextCheck = (m: Mission, s: LabState) => m.checks(s).find((c) => !c.ok) ?? null;
