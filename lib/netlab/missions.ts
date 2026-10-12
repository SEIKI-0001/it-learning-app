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
  type ExternalId,
  type LabState,
  type PlaceableKind,
  type TestId,
} from "./engine";
import { SLOTS } from "./layout";

// ミッション：小さな会社のオフィスを、LAN → DHCP → インターネット → サーバ → Wi-Fi → DMZ の順に作り上げる。
// 判定は毎回 state から計算し直す（「いま満たしているか」を常に表示する）。
// 各チェックには「次の一手」（その操作をする・該当の設定を開く・テストを流す）を持たせ、
// ガイドからボタン1つでそこへ連れていけるようにする。

/** 開く設定欄（設定パネルの該当欄を目立たせる） */
export type FocusField =
  | "router.dhcp"
  | "router.range"
  | "router.dns"
  | "router.nat"
  | "file.ip"
  | "ap.security"
  | "fw.rules";

export type CheckAction = {
  /** ボタンの文言 */
  label: string;
  /** 置く：役割カードを開き、確認に正解したら置く */
  place?: PlaceableKind;
  /** つなぐ：この2つの名札の間に、模型の上で「ドラッグの見本」を出す（1つ目から2つ目へ） */
  wire?: [DeviceId, DeviceId];
  /** その場で実行する（配線・つなぎ直し） */
  run?: (s: LabState) => LabState;
  /** この機器を選び、設定欄を目立たせる（切り替えは利用者が自分でする） */
  focus?: { device: DeviceId; field: FocusField };
  /** テストを流す（小包のアニメーション） */
  test?: TestId;
  /** 脈打たせる名札 */
  highlight?: DeviceId[];
};

export type Check = { label: string; ok: boolean; hint?: string; action?: CheckAction };

export type Mission = {
  id: string;
  title: string;
  /** 依頼の文（社長からのお願い） */
  story: string;
  /** 学べる用語（ITパスポートのシラバス用語） */
  terms: string[];
  /** このミッションで確かめるテスト（先頭を達成の瞬間に流す。空なら流さない） */
  tests: TestId[];
  /** このミッションで触る・見る機器（ほかの名札は隠して、見るものを減らす） */
  focus: DeviceId[];
  /** 模型の外に出す相手（お客さん・攻撃者など）。関係ないミッションでは出さない */
  externals: ExternalId[];
  checks: (state: LabState) => Check[];
  /** 「答えを見る」で、このミッションまでを完成させる */
  solve: (state: LabState) => LabState;
};

const linkedTo = (state: LabState, a: DeviceId, b: DeviceId) => neighbors(state, a).includes(b);

/** 機器ごとの置き場所の希望順（「置く」で入る場所）。埋まっていれば次の空きへ */
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

/** 希望の置き場所へ置く（置き済み・空きなしなら何もしない） */
export function autoPlace(state: LabState, kind: PlaceableKind): LabState {
  if (isPresent(state, kind)) return state;
  const slot = freeSlotFor(state, kind);
  return slot ? place(state, kind, slot) : state;
}

const placeAction = (kind: PlaceableKind): CheckAction => ({
  label: `${DEVICE_NAME[kind]}の役割を確認して置く`,
  place: kind,
});

const wireAction = (a: DeviceId, b: DeviceId): CheckAction => ({
  label: `ボタンでつなぐ`,
  wire: [a, b],
  run: (s) => connect(s, a, b),
  highlight: [a, b],
});

/** まだ置いていなければ置く、置いてあればつなぐ */
const placeThenWire = (s: LabState, kind: PlaceableKind, to: DeviceId): CheckAction =>
  isPresent(s, kind) ? wireAction(kind, to) : placeAction(kind);

const testAction = (id: TestId): CheckAction => ({ label: "テストして確かめる", test: id });

export const MISSIONS: Mission[] = [
  {
    id: "lan",
    title: "1. 社員の PC を LAN でつなぐ",
    story: "2人の社員が、お互いの PC でファイルを渡し合えるようにしてほしい。まずはケーブルでつなごう。",
    terms: ["LAN", "スイッチ（L2スイッチ）", "スター型"],
    // つないだだけでは IP がなく ping は届かない（それがミッション2の入口）。達成の演出でわざと失敗を見せない
    tests: [],
    focus: ["switch", ...PCS],
    externals: [],
    checks: (s) => [
      {
        label: "スイッチをサーバ室に置く",
        ok: isPresent(s, "switch"),
        hint: "スイッチは、LAN の機器を1か所に集めてつなぐ役。",
        action: placeAction("switch"),
      },
      ...PCS.map((pc) => ({
        label: `${DEVICE_NAME[pc]} をスイッチにつなぐ`,
        ok: linkedTo(s, pc, "switch"),
        hint: "どの PC もスイッチへ1本ずつ。この形を「スター型」といいます。",
        action: isPresent(s, "switch") ? wireAction(pc, "switch") : placeAction("switch"),
      })),
    ],
    solve: (s) => PCS.reduce((acc, pc) => connect(acc, pc, "switch"), autoPlace(s, "switch")),
  },
  {
    id: "dhcp",
    title: "2. IP アドレスを自動で配る",
    story: "ケーブルはつながったが、まだ PC 同士で通信できない。ネットワーク上の住所＝IP アドレスが決まっていないからだ。1台ずつ手で決める代わりに、ルータの DHCP で自動で配ろう。",
    terms: ["IP アドレス", "DHCP", "プライベート IP アドレス", "ping"],
    tests: ["ping-ab"],
    focus: ["router", "switch", ...PCS],
    externals: [],
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
          label: "2台の PC に IP アドレスが配られる",
          ok: PCS.every((pc) => !!sim.hosts[pc]?.ip && !sim.hosts[pc]?.conflict),
          hint: "PC の画面に 192.168.1.x が出れば配られています。",
        },
        { label: "テスト：PC-A → PC-B に ping が届く", ok: runTest(s, "ping-ab", sim).ok, action: testAction("ping-ab") },
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
    focus: ["router", "onu", "pc-a"],
    externals: ["internet"],
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
          hint: "社内のプライベート IP アドレスを、インターネットで使えるグローバル IP アドレスに付け替える仕組み。",
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
    story: "社員みんなで使う共有フォルダ用に、ファイルサーバを置こう。いつも同じ住所で見つかるよう、IP アドレスは手で決めて（固定して）おく。",
    terms: ["ファイルサーバ", "固定 IP アドレス", "IP アドレスの重複", "サブネット"],
    tests: ["ping-file"],
    focus: ["fileServer", "switch", "pc-b"],
    externals: [],
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
        { label: "テスト：PC-B からファイルサーバに届く", ok: runTest(s, "ping-file", sim).ok, action: testAction("ping-file") },
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
    story: "会議室ではノート PC を無線で使いたい。無線 AP を置こう。ただし、建物の外にいる近所の人に勝手に使われないようにすること。",
    terms: ["無線LAN", "アクセスポイント", "SSID", "WPA2 / WPA3"],
    tests: ["web-laptop", "outsider-wifi"],
    focus: ["ap", "switch", "laptop"],
    externals: ["internet", "outsider"],
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
    focus: ["firewall", "router", "onu", "webServer", "fileServer"],
    externals: ["internet", "customer", "attacker"],
    checks: (s) => {
      const sim = simulate(s);
      // つなぎ直し：ファイアウォールを置く → ルータ⇔ONU を外す → ONU⇔FW → FW⇔ルータ（1手ずつ進める）
      const rewire: CheckAction = !isPresent(s, "firewall")
        ? placeAction("firewall")
        : linkedTo(s, "router", "onu")
          ? { label: "ルータ⇔ONU のケーブルを外す", run: (t) => disconnect(t, "router", "onu"), highlight: ["router"] }
          : !linkedTo(s, "onu", "firewall")
            ? wireAction("onu", "firewall")
            : wireAction("firewall", "router");
      const webWire: CheckAction = !isPresent(s, "webServer")
        ? placeAction("webServer")
        : ({
            label: "ボタンでつなぐ",
            wire: ["webServer", "firewall"],
            run: (t) => connect({ ...t, links: t.links.filter((l) => l.a !== "webServer" && l.b !== "webServer") }, "firewall", "webServer"),
            highlight: ["webServer", "firewall"],
          } satisfies CheckAction);
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
          hint: "DMZ は、インターネットと社内 LAN の間に設ける区画。ファイアウォールで両側から仕切り、外に公開するサーバだけを置きます。",
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
      // ルータ⇔ONU の直結と、LAN 側に置いていた Web サーバの線は外してからつなぎ直す
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

/** ミッションで次にやること（最初の未達成のチェック） */
export const nextCheck = (m: Mission, s: LabState) => m.checks(s).find((c) => !c.ok) ?? null;
