import {
  PCS,
  connect,
  inDhcpRange,
  isPresent,
  neighbors,
  place,
  runTest,
  sameSubnet,
  simulate,
  type LabState,
  type PlaceableKind,
  type TestId,
} from "./engine";

// ミッション：小さな会社のオフィスを、LAN → DHCP → インターネット → サーバ → Wi-Fi → DMZ の順に作り上げる。
// 判定は毎回 state から計算し直す（「いま満たしているか」を常に表示する）。

export type Check = { label: string; ok: boolean; hint?: string };

export type Mission = {
  id: string;
  title: string;
  /** 依頼の文（社長からのお願い） */
  story: string;
  /** 学べる用語（ITパスポートのシラバス用語） */
  terms: string[];
  /** このミッションで確かめるテスト */
  tests: TestId[];
  checks: (state: LabState) => Check[];
  /** 「答えを見る」で、このミッションまでを完成させる */
  solve: (state: LabState) => LabState;
};

const linkedTo = (state: LabState, a: Parameters<typeof neighbors>[1], b: Parameters<typeof neighbors>[1]) =>
  neighbors(state, a).includes(b);

const ensure = (state: LabState, kind: PlaceableKind, slot: string) => (isPresent(state, kind) ? state : place(state, kind, slot));

export const MISSIONS: Mission[] = [
  {
    id: "lan",
    title: "1. 社員の PC を LAN でつなぐ",
    story: "4人の社員が、お互いの PC でファイルを渡し合えるようにしてほしい。まずはケーブルでつなごう。",
    terms: ["LAN", "スイッチ（L2スイッチ）", "スター型"],
    tests: ["ping-ab"],
    checks: (s) => [
      { label: "スイッチをサーバ室に置く", ok: isPresent(s, "switch"), hint: "下の「機器を置く」からスイッチを選び、サーバ室の置き場所を押します。" },
      ...PCS.map((pc) => ({
        label: `${pc.toUpperCase()} をスイッチにつなぐ`,
        ok: linkedTo(s, pc, "switch"),
        hint: "PC の名札を押して「ケーブルをつなぐ」→ スイッチを選びます。",
      })),
    ],
    solve: (s) => {
      let t = ensure(s, "switch", "s4");
      for (const pc of PCS) t = connect(t, pc, "switch");
      return t;
    },
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
        { label: "ルータを置く", ok: isPresent(s, "router") },
        { label: "ルータの LAN ポートをスイッチにつなぐ", ok: linkedTo(s, "router", "switch") },
        {
          label: "ルータの DHCP を有効にする（配布範囲も正しく）",
          ok: s.router.dhcp && !sim.dhcpProblem,
          hint: sim.dhcpProblem ?? "ルータの名札を押して「DHCP サーバ」をオンにします。",
        },
        { label: "4台すべてに IP アドレスが配られる", ok: PCS.every((pc) => !!sim.hosts[pc]?.ip && !sim.hosts[pc]?.conflict) },
        { label: "テスト：PC-A → PC-D に ping が届く", ok: runTest(s, "ping-ad", sim).ok },
      ];
    },
    solve: (s) => {
      let t = ensure(s, "router", "s2");
      t = connect(t, "router", "switch");
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
        { label: "ルータの WAN ポートを ONU につなぐ", ok: sim.routerOnline },
        { label: "DHCP で配る DNS サーバを設定する", ok: s.router.dns !== "", hint: "ルータの設定の「DNS サーバ」を選びます。" },
        { label: "NAT を有効にしておく", ok: s.router.nat },
        { label: "テスト：PC-A で Web サイトが見られる", ok: runTest(s, "web-pc", sim).ok },
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
      return [
        { label: "ファイルサーバを置いて、スイッチにつなぐ", ok: linkedTo(s, "fileServer", "switch") },
        { label: "ルータと同じネットワークの IP アドレスにする", ok: isPresent(s, "fileServer") && sameSubnet(ip, s.router.lanIp) },
        {
          label: "DHCP の配布範囲と重ならないアドレスにする",
          ok: isPresent(s, "fileServer") && !inDhcpRange(s.router, ip) && !h?.conflict && ip !== s.router.lanIp,
          hint: `今の配布範囲は ${s.router.dhcpStart} 〜 ${s.router.dhcpEnd}。範囲の外（例：192.168.1.10）にします。`,
        },
        { label: "テスト：PC-C からファイルサーバに届く", ok: runTest(s, "ping-file", sim).ok },
      ];
    },
    solve: (s) => {
      let t = ensure(s, "fileServer", "s5");
      t = connect(t, "fileServer", "switch");
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
        { label: "無線 AP を置いて、スイッチにつなぐ", ok: linkedTo(s, "ap", "switch") },
        { label: "暗号化を WPA2 か WPA3 にする", ok: isPresent(s, "ap") && s.ap.security !== "none" },
        { label: "テスト：ノート PC で Web サイトが見られる", ok: runTest(s, "web-laptop", sim).ok },
        { label: "テスト：近所の人は接続できない", ok: isPresent(s, "ap") && runTest(s, "outsider-wifi", sim).ok },
      ];
    },
    solve: (s) => {
      let t = ensure(s, "ap", "w1");
      t = connect(t, "ap", "switch");
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
      return [
        {
          label: "ONU → ファイアウォール → ルータ の順につなぎ直す",
          ok: sim.routerVia === "firewall",
          hint: "ルータと ONU のケーブルを外し、ONU とファイアウォール、ファイアウォールとルータをつなぎます。",
        },
        { label: "Web サーバをファイアウォールの DMZ ポートにつなぐ", ok: sim.webServerZone === "dmz" },
        { label: "ファイルサーバは社内 LAN に置いたまま", ok: sim.fileServerZone === "lan" },
        { label: "テスト：お客さんが自社サイトを見られる", ok: runTest(s, "customer-web", sim).ok },
        {
          label: "テスト：攻撃者の SSH（22）を止める",
          ok: sim.webServerZone !== null && runTest(s, "attack-ssh", sim).ok,
          hint: "許可するのは必要なポート（HTTPS の 443）だけにします。",
        },
        { label: "テスト：攻撃者はファイルサーバに届かない", ok: runTest(s, "attack-file", sim).ok },
        { label: "テスト：社員は今まで通り Web を見られる", ok: runTest(s, "web-pc", sim).ok },
      ];
    },
    solve: (s) => {
      let t = ensure(s, "firewall", "s1");
      t = ensure(t, "webServer", "s3");
      // ルータ⇔ONU の直結と、LAN 側に置いていた Web サーバの線は外してからつなぎ直す
      const drop = (a: string, b: string) => (l: { a: string; b: string }) => !((l.a === a && l.b === b) || (l.a === b && l.b === a));
      t = { ...t, links: t.links.filter(drop("router", "onu")).filter((l) => l.a !== "webServer" && l.b !== "webServer") };
      t = connect(t, "onu", "firewall");
      t = connect(t, "firewall", "router");
      t = connect(t, "firewall", "webServer");
      return { ...t, firewall: { outbound: true, inHttps: true, inOther: false } };
    },
  },
];

export const missionDone = (m: Mission, s: LabState) => m.checks(s).every((c) => c.ok);
