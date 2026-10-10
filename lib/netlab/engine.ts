// ネットワーク構築ラボ（/netlab）のシミュレーション本体。画面から切り離した純粋な関数だけを置く。
//
// 模型の約束（ITパスポートの範囲で「なぜ届かないか」を説明できる粒度に絞る）
//   - サブネットは 192.168.x.0/24 固定。ネットワーク部＝先頭3つの数字
//   - ルータ：WAN 1口（ONU かファイアウォールへ）＋ LAN 1口。NAT と DHCP サーバを内蔵
//   - ファイアウォール：WAN（ONU）／LAN（ルータ・スイッチ）／DMZ（公開サーバ）の3口。ONU とルータの間に挟む
//   - スイッチ：8口。つないだ機器を1つの LAN（同じ島）にまとめる
//   - ノートPCは無線だけ。アクセスポイントが LAN にあれば自動で参加する
//   - ポートの役割（WAN/LAN/DMZ）は、相手の機器の種類から自動で決める
// 物理のつながり（links）と設定から、IP の配布・疎通テスト・ミッション判定をすべて毎回計算し直す。

export type DeviceKind = "onu" | "router" | "firewall" | "switch" | "fileServer" | "webServer" | "ap" | "pc" | "laptop";
export type PlaceableKind = "switch" | "router" | "fileServer" | "ap" | "firewall" | "webServer";
export type DeviceId = "onu" | "pc-a" | "pc-b" | "pc-c" | "pc-d" | "laptop" | PlaceableKind;
/** 建物の外にいる相手（テストの送り手・受け手）。模型の外の点として描く */
export type ExternalId = "internet" | "customer" | "attacker" | "outsider";
export type HopId = DeviceId | ExternalId;

export const PCS = ["pc-a", "pc-b", "pc-c", "pc-d"] as const;
export const FIXED_DEVICES: DeviceId[] = ["onu", ...PCS, "laptop"];
export const PLACEABLE: PlaceableKind[] = ["switch", "router", "fileServer", "ap", "firewall", "webServer"];

export const DEVICE_NAME: Record<DeviceId, string> = {
  onu: "ONU（光回線）",
  "pc-a": "PC-A",
  "pc-b": "PC-B",
  "pc-c": "PC-C",
  "pc-d": "PC-D",
  laptop: "会議室ノートPC",
  switch: "スイッチ",
  router: "ルータ",
  fileServer: "ファイルサーバ",
  ap: "無線AP",
  firewall: "ファイアウォール",
  webServer: "Webサーバ",
};

export const HOP_NAME: Record<HopId, string> = {
  ...DEVICE_NAME,
  internet: "インターネット",
  customer: "お客さん",
  attacker: "攻撃者",
  outsider: "近所の人",
};

export function kindOf(id: DeviceId): DeviceKind {
  if (id.startsWith("pc-")) return "pc";
  return id as DeviceKind;
}

export type DnsChoice = "" | "router" | "isp" | "public";
export const DNS_ADDRESS: Record<Exclude<DnsChoice, "">, string> = {
  router: "ルータ経由",
  isp: "203.0.113.53",
  public: "8.8.8.8",
};

export type RouterConfig = { lanIp: string; dhcp: boolean; dhcpStart: string; dhcpEnd: string; dns: DnsChoice; nat: boolean };
export type FileServerConfig = { ip: string };
export type FirewallConfig = { outbound: boolean; inHttps: boolean; inOther: boolean };
export type ApConfig = { ssid: string; security: "none" | "wpa2" | "wpa3" };

export type Link = { a: DeviceId; b: DeviceId };

export type LabState = {
  /** 置いた機器 → 置き場所（slot id） */
  placed: Partial<Record<PlaceableKind, string>>;
  links: Link[];
  router: RouterConfig;
  fileServer: FileServerConfig;
  firewall: FirewallConfig;
  ap: ApConfig;
};

export function initialState(): LabState {
  return {
    placed: {},
    links: [],
    // DHCP は最初は切ってある（ミッション2で入れる）。ファイルサーバの IP はわざと配布範囲の先頭と同じにしてある（ミッション4の落とし穴）
    router: { lanIp: "192.168.1.1", dhcp: false, dhcpStart: "192.168.1.100", dhcpEnd: "192.168.1.199", dns: "", nat: true },
    fileServer: { ip: "192.168.1.100" },
    firewall: { outbound: true, inHttps: false, inOther: false },
    ap: { ssid: "OFFICE-WIFI", security: "none" },
  };
}

export function isPresent(state: LabState, id: DeviceId): boolean {
  return FIXED_DEVICES.includes(id) || state.placed[id as PlaceableKind] !== undefined;
}

export const linkKey = (l: Link) => [l.a, l.b].sort().join("~");

export function neighbors(state: LabState, id: DeviceId): DeviceId[] {
  return state.links.flatMap((l) => (l.a === id ? [l.b] : l.b === id ? [l.a] : []));
}

// ---------------------------------------------------------------------------
// ポート
// ---------------------------------------------------------------------------

export type PortRole = "wan" | "lan" | "dmz" | "port";

export function portRole(id: DeviceId, peer: DeviceId): PortRole {
  const k = kindOf(id);
  const p = kindOf(peer);
  if (k === "router") return p === "onu" || p === "firewall" ? "wan" : "lan";
  if (k === "firewall") {
    if (p === "onu") return "wan";
    if (p === "fileServer" || p === "webServer") return "dmz";
    return "lan";
  }
  return "port";
}

const PORT_CAPACITY: Record<DeviceKind, Partial<Record<PortRole, number>>> = {
  router: { wan: 1, lan: 1 },
  firewall: { wan: 1, lan: 1, dmz: 1 },
  switch: { port: 8 },
  onu: { port: 1 },
  pc: { port: 1 },
  laptop: {},
  fileServer: { port: 1 },
  webServer: { port: 1 },
  ap: { port: 1 },
};

const PORT_LABEL: Record<PortRole, string> = { wan: "WAN", lan: "LAN", dmz: "DMZ", port: "LAN" };
export const portLabel = (r: PortRole) => PORT_LABEL[r];

export type ConnectCheck = { ok: true; roleA: PortRole; roleB: PortRole } | { ok: false; reason: string };

export function canConnect(state: LabState, a: DeviceId, b: DeviceId): ConnectCheck {
  if (a === b) return { ok: false, reason: "同じ機器どうしはつなげません。" };
  if (!isPresent(state, a) || !isPresent(state, b)) return { ok: false, reason: "まだ置いていない機器です。" };
  if (kindOf(a) === "laptop" || kindOf(b) === "laptop")
    return { ok: false, reason: "ノートPCは無線（Wi-Fi）でつなぎます。LAN に無線APを置いてください。" };
  if (state.links.some((l) => linkKey(l) === linkKey({ a, b }))) return { ok: false, reason: "もうつながっています。" };
  const terminal = (k: DeviceKind) => k === "pc" || k === "fileServer" || k === "webServer";
  if (terminal(kindOf(a)) && terminal(kindOf(b)))
    return { ok: false, reason: "端末どうしを直結すると、ほかの機器と通信できません。間にスイッチを置きましょう。" };
  const roleA = portRole(a, b);
  const roleB = portRole(b, a);
  for (const [id, role, peer] of [
    [a, roleA, b],
    [b, roleB, a],
  ] as const) {
    const cap = PORT_CAPACITY[kindOf(id)][role] ?? 0;
    const used = neighbors(state, id).filter((n) => portRole(id, n) === role).length;
    if (used >= cap) {
      const where = role === "port" ? "" : `${PORT_LABEL[role]}ポート`;
      return {
        ok: false,
        reason: `${DEVICE_NAME[id]}の${where || "ポート"}は空いていません（${DEVICE_NAME[peer]}をつなぐ口がない）。`,
      };
    }
  }
  return { ok: true, roleA, roleB };
}

// ---------------------------------------------------------------------------
// IP アドレス
// ---------------------------------------------------------------------------

export function parseIp(s: string): number[] | null {
  const m = s.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n >= 0 && n <= 255) ? parts : null;
}

const net24 = (ip: number[]) => ip.slice(0, 3).join(".");
export const sameSubnet = (a: string, b: string) => {
  const pa = parseIp(a);
  const pb = parseIp(b);
  return !!pa && !!pb && net24(pa) === net24(pb);
};
const lastOctet = (s: string) => parseIp(s)?.[3] ?? -1;

export function dhcpRangeProblem(r: RouterConfig): string | null {
  const lan = parseIp(r.lanIp);
  const s = parseIp(r.dhcpStart);
  const e = parseIp(r.dhcpEnd);
  if (!lan) return "ルータの LAN 側 IP アドレスの形が正しくありません（例：192.168.1.1）。";
  if (lan[3] === 0 || lan[3] === 255) return "末尾が 0 と 255 のアドレスは機器に使えません（ネットワークとブロードキャスト用）。";
  if (!s || !e) return "DHCP の配布範囲の形が正しくありません。";
  if (net24(s) !== net24(lan) || net24(e) !== net24(lan))
    return `配布範囲がルータと別のネットワークです（ルータは ${net24(lan)}.x）。`;
  if (s[3] > e[3]) return "配布範囲の始まりが終わりより大きくなっています。";
  if (s[3] === 0 || e[3] === 255) return "末尾が 0 と 255 のアドレスは配れません。";
  if (lan[3] >= s[3] && lan[3] <= e[3]) return "ルータ自身のアドレスが配布範囲に入っています。";
  return null;
}

export const inDhcpRange = (r: RouterConfig, ip: string) =>
  sameSubnet(ip, r.dhcpStart) && lastOctet(ip) >= lastOctet(r.dhcpStart) && lastOctet(ip) <= lastOctet(r.dhcpEnd);

// ---------------------------------------------------------------------------
// つながり（同じ LAN の島）と、IP の配布
// ---------------------------------------------------------------------------

/** ルータ・ファイアウォールは口ごとに別の島に属する（中で島を分ける機器だから）。 */
const node = (id: DeviceId, peer: DeviceId) => {
  const k = kindOf(id);
  return k === "router" || k === "firewall" ? `${id}:${portRole(id, peer)}` : id;
};

export type HostInfo = {
  ip: string | null;
  /** どこから IP を得たか */
  source?: "dhcp" | "static" | "public";
  /** IP がないとき・おかしいときの理由 */
  problem?: string;
  conflict?: boolean;
};

export type Sim = {
  /** 島の番号（node キー → 代表） */
  island: (key: string) => string;
  /** ノートPCが無線で LAN に入れているか */
  wifiJoined: boolean;
  routerOnline: boolean;
  routerVia: "onu" | "firewall" | null;
  firewallOnline: boolean;
  webServerZone: "dmz" | "lan" | null;
  fileServerZone: "dmz" | "lan" | null;
  hosts: Partial<Record<DeviceId, HostInfo>>;
  dhcpProblem: string | null;
};

export function simulate(state: LabState): Sim {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    const p = parent.get(k) ?? k;
    if (p === k) return k;
    const r = find(p);
    parent.set(k, r);
    return r;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  for (const l of state.links) union(node(l.a, l.b), node(l.b, l.a));

  const apLinked = isPresent(state, "ap") && neighbors(state, "ap").length > 0;
  if (apLinked) union("laptop", "ap");

  const same = (a: string, b: string) => find(a) === find(b);
  const routerHas = (role: PortRole) => isPresent(state, "router") && neighbors(state, "router").some((n) => portRole("router", n) === role);
  const fwHas = (role: PortRole) => isPresent(state, "firewall") && neighbors(state, "firewall").some((n) => portRole("firewall", n) === role);

  const firewallOnline = fwHas("wan") && same("firewall:wan", "onu");
  let routerVia: Sim["routerVia"] = null;
  if (routerHas("wan")) {
    if (same("router:wan", "onu")) routerVia = "onu";
    else if (firewallOnline && fwHas("lan") && same("router:wan", "firewall:lan")) routerVia = "firewall";
  }

  const lanKey = routerHas("lan") ? "router:lan" : null;
  const inLan = (k: string) => !!lanKey && same(k, lanKey);
  const inDmz = (k: string) => fwHas("dmz") && same(k, "firewall:dmz");
  const zone = (id: DeviceId): "dmz" | "lan" | null =>
    !isPresent(state, id) || neighbors(state, id).length === 0 ? null : inDmz(id) ? "dmz" : inLan(id) ? "lan" : null;

  const hosts: Sim["hosts"] = {};
  const dhcpProblem = state.router.dhcp ? dhcpRangeProblem(state.router) : null;
  const dhcpReady = isPresent(state, "router") && state.router.dhcp && !dhcpProblem;

  // DHCP のお客（決まった順に配る：机の順 → ノートPC → LAN に置いた Web サーバ）
  const clients: DeviceId[] = [...PCS, "laptop", "webServer"];
  let next = lastOctet(state.router.dhcpStart);
  const end = lastOctet(state.router.dhcpEnd);
  for (const id of clients) {
    if (!isPresent(state, id)) continue;
    if (id === "webServer" && zone(id) === "dmz") {
      hosts[id] = { ip: "203.0.113.10", source: "public" };
      continue;
    }
    const connected = id === "laptop" ? apLinked : neighbors(state, id).length > 0;
    if (!connected) {
      hosts[id] = { ip: null, problem: id === "laptop" ? "無線APがありません。" : "ケーブルがつながっていません。" };
      continue;
    }
    if (!inLan(id)) {
      hosts[id] = {
        ip: null,
        problem: isPresent(state, "router") ? "ルータ（DHCP サーバ）と同じ LAN にいません。" : "IP アドレスを配る機器（DHCP サーバ）がありません。",
      };
      continue;
    }
    if (!state.router.dhcp) {
      hosts[id] = { ip: null, problem: "ルータの DHCP が無効です。IP アドレスをもらえません。" };
      continue;
    }
    if (!dhcpReady) {
      hosts[id] = { ip: null, problem: `DHCP の設定に誤りがあります：${dhcpProblem}` };
      continue;
    }
    if (next > end) {
      hosts[id] = { ip: null, problem: "DHCP の配布範囲を使い切りました。" };
      continue;
    }
    const prefix = state.router.dhcpStart.split(".").slice(0, 3).join(".");
    hosts[id] = { ip: `${prefix}.${next}`, source: "dhcp" };
    next++;
  }

  if (isPresent(state, "fileServer")) {
    const ip = state.fileServer.ip.trim();
    const z = zone("fileServer");
    if (!parseIp(ip)) hosts.fileServer = { ip: null, source: "static", problem: "IP アドレスの形が正しくありません。" };
    else if (neighbors(state, "fileServer").length === 0) hosts.fileServer = { ip, source: "static", problem: "ケーブルがつながっていません。" };
    else if (z === "lan" && !sameSubnet(ip, state.router.lanIp))
      hosts.fileServer = { ip, source: "static", problem: `ルータ（${state.router.lanIp}）と別のネットワークのアドレスです。` };
    else hosts.fileServer = { ip, source: "static" };
  }

  // 同じ島で同じ IP を持つ機器は、両方とも「重複」
  const byIp = new Map<string, DeviceId[]>();
  for (const [id, h] of Object.entries(hosts) as [DeviceId, HostInfo][]) {
    if (!h.ip || h.source === "public") continue;
    const key = `${find(id)}|${h.ip}`;
    byIp.set(key, [...(byIp.get(key) ?? []), id]);
  }
  for (const ids of byIp.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) hosts[id] = { ...hosts[id]!, conflict: true };
  }

  return {
    island: find,
    wifiJoined: apLinked,
    routerOnline: routerVia !== null,
    routerVia,
    firewallOnline,
    webServerZone: zone("webServer"),
    fileServerZone: zone("fileServer"),
    hosts,
    dhcpProblem,
  };
}

// ---------------------------------------------------------------------------
// 経路（物理のつながりを最短でたどる）
// ---------------------------------------------------------------------------

function route(state: LabState, from: DeviceId, to: DeviceId, through: (id: DeviceId) => boolean): DeviceId[] | null {
  const adj = (id: DeviceId): DeviceId[] => {
    const ns = neighbors(state, id);
    if (id === "ap" && isPresent(state, "ap")) ns.push("laptop");
    if (id === "laptop" && isPresent(state, "ap") && neighbors(state, "ap").length > 0) ns.push("ap");
    return ns;
  };
  const prev = new Map<DeviceId, DeviceId | null>([[from, null]]);
  const queue: DeviceId[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    if (cur !== from && !through(cur)) continue;
    for (const n of adj(cur)) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      queue.push(n);
    }
  }
  if (!prev.has(to)) return null;
  const path: DeviceId[] = [];
  for (let c: DeviceId | null = to; c; c = prev.get(c) ?? null) path.unshift(c);
  return path;
}

/** LAN の中を通るとき：スイッチ・AP は素通りできる。ルータ・ファイアウォールは端点だけ */
const l2 = (id: DeviceId) => kindOf(id) === "switch" || kindOf(id) === "ap";
const anyRelay = (id: DeviceId) => l2(id) || kindOf(id) === "firewall";

const join = (...parts: (DeviceId[] | HopId[] | null)[]): HopId[] => {
  const out: HopId[] = [];
  for (const p of parts) for (const h of p ?? []) if (out[out.length - 1] !== h) out.push(h);
  return out;
};

// ---------------------------------------------------------------------------
// 疎通テスト
// ---------------------------------------------------------------------------

export type TestId =
  | "ping-ab"
  | "ping-ad"
  | "ping-file"
  | "web-pc"
  | "web-laptop"
  | "customer-web"
  | "attack-file"
  | "attack-ssh"
  | "outsider-wifi";

export type TestStep = { ok: boolean; text: string };
export type TestResult = {
  id: TestId;
  title: string;
  /** 成功＝届くべきものが届いた／防ぐべきものを防いだ */
  ok: boolean;
  /** 通信が実際に届いたか（攻撃テストでは「届いた」が失敗） */
  reached: boolean;
  /** たどった経路（失敗したら止まった所まで） */
  path: HopId[];
  steps: TestStep[];
  summary: string;
};

export const TESTS: { id: TestId; title: string; kind: "reach" | "block" }[] = [
  { id: "ping-ab", title: "PC-A → PC-B（ping）", kind: "reach" },
  { id: "ping-ad", title: "PC-A → PC-D（ping）", kind: "reach" },
  { id: "web-pc", title: "PC-A → Webサイトを見る", kind: "reach" },
  { id: "ping-file", title: "PC-C → ファイルサーバ", kind: "reach" },
  { id: "web-laptop", title: "会議室ノートPC → Webサイト", kind: "reach" },
  { id: "outsider-wifi", title: "近所の人が Wi-Fi に接続", kind: "block" },
  { id: "customer-web", title: "お客さん → 自社Webサイト（HTTPS 443）", kind: "reach" },
  { id: "attack-ssh", title: "攻撃者 → Webサーバに SSH（22）", kind: "block" },
  { id: "attack-file", title: "攻撃者 → ファイルサーバ（445）", kind: "block" },
];

class Run {
  steps: TestStep[] = [];
  path: HopId[] = [];
  constructor(
    readonly id: TestId,
    readonly title: string,
  ) {}
  pass(text: string) {
    this.steps.push({ ok: true, text });
    return true;
  }
  /** 届かずに止まった（通常のテストの失敗） */
  stop(text: string, summary = text): TestResult {
    this.steps.push({ ok: false, text });
    return { id: this.id, title: this.title, ok: false, reached: false, path: this.path, steps: this.steps, summary };
  }
  reached(summary: string): TestResult {
    return { id: this.id, title: this.title, ok: true, reached: true, path: this.path, steps: this.steps, summary };
  }
  /** 攻撃を防いだ（止まったことが成功） */
  blocked(text: string, summary = text): TestResult {
    this.steps.push({ ok: true, text });
    return { id: this.id, title: this.title, ok: true, reached: false, path: this.path, steps: this.steps, summary };
  }
  breached(text: string, summary = text): TestResult {
    this.steps.push({ ok: false, text });
    return { id: this.id, title: this.title, ok: false, reached: true, path: this.path, steps: this.steps, summary };
  }
}

/** 送り手・受け手が通信できる状態か。だめなら理由を返す */
function hostProblem(run: Run, state: LabState, sim: Sim, id: DeviceId): string | null {
  const name = DEVICE_NAME[id];
  if (!isPresent(state, id)) return `${name}がまだ置かれていません。`;
  const h = sim.hosts[id];
  if (!h?.ip || h.problem) return `${name}：${h?.problem ?? "IP アドレスがありません。"}`;
  if (h.conflict) return `${name}の ${h.ip} はほかの機器と重複しています。どちらに届くか決まらず、通信が不安定になります。`;
  run.pass(`${name}の IP アドレス：${h.ip}${h.source === "dhcp" ? "（DHCP で取得）" : h.source === "static" ? "（固定）" : ""}`);
  return null;
}

function ping(state: LabState, sim: Sim, id: TestId, title: string, src: DeviceId, dst: DeviceId): TestResult {
  const run = new Run(id, title);
  run.path = [src];
  const srcProblem = hostProblem(run, state, sim, src);
  if (srcProblem) return run.stop(srcProblem);
  if (!isPresent(state, dst)) return run.stop(`${DEVICE_NAME[dst]}がまだ置かれていません。`);
  const r = route(state, src, dst, l2);
  if (!r) {
    const partial = route(state, src, "router", l2) ?? route(state, src, "switch", l2);
    run.path = join(partial ?? [src]);
    return run.stop(`${DEVICE_NAME[src]}から${DEVICE_NAME[dst]}まで、ケーブル（スイッチ）でつながっていません。`);
  }
  run.path = r;
  const dstProblem = hostProblem(run, state, sim, dst);
  if (dstProblem) return run.stop(dstProblem);
  const a = sim.hosts[src]!.ip!;
  const b = sim.hosts[dst]!.ip!;
  if (!sameSubnet(a, b)) return run.stop(`${a} と ${b} はネットワーク部が違います（ルータを通さないと届きません）。`);
  run.pass(`同じ LAN（${a.split(".").slice(0, 3).join(".")}.x）の中なので、スイッチが直接届けます。`);
  return run.reached(`${DEVICE_NAME[dst]}から応答がありました。`);
}

function web(state: LabState, sim: Sim, id: TestId, title: string, src: DeviceId): TestResult {
  const run = new Run(id, title);
  run.path = [src];
  const srcProblem = hostProblem(run, state, sim, src);
  if (srcProblem) return run.stop(srcProblem);
  const toRouter = route(state, src, "router", l2);
  if (!toRouter) return run.stop("出口（デフォルトゲートウェイ）のルータまでつながっていません。");
  run.path = toRouter;
  run.pass(`宛先が社外なので、デフォルトゲートウェイ（ルータ ${state.router.lanIp}）へ渡します。`);
  if (!state.router.dns) return run.stop("DNS サーバが設定されていません。「www.example.com」を IP アドレスに変換（名前解決）できません。");
  run.pass(`DNS で www.example.com → 93.184.215.14 に変換（DNS：${DNS_ADDRESS[state.router.dns]}）。`);
  if (!sim.routerOnline) {
    const upstream = route(state, "router", "onu", anyRelay);
    if (upstream) run.path = join(toRouter, upstream);
    return run.stop("ルータの WAN 側がインターネット（ONU）につながっていません。");
  }
  const upstream = route(state, "router", "onu", anyRelay)!;
  if (!state.router.nat) {
    return run.stop("NAT が無効です。プライベート IP アドレス（192.168.x.x）のままではインターネットで返事が戻ってきません。");
  }
  run.pass("NAT でプライベート IP アドレスをグローバル IP アドレスに付け替えて送り出します。");
  if (sim.routerVia === "firewall") {
    run.path = join(toRouter, ["router", "firewall"]);
    if (!state.firewall.outbound) return run.stop("ファイアウォールが社内からインターネットへの通信を拒否しています。");
    run.pass("ファイアウォール：社内 → インターネットは許可。");
  }
  run.path = join(toRouter, upstream, ["internet"]);
  return run.reached("Webサイトが表示されました。");
}

function customerWeb(state: LabState, sim: Sim): TestResult {
  const run = new Run("customer-web", "お客さん → 自社Webサイト（HTTPS 443）");
  run.path = ["customer", "internet", "onu"];
  if (!isPresent(state, "webServer")) return run.stop("Webサーバがまだ置かれていません。");
  if (sim.webServerZone === "lan")
    return run.stop("Webサーバが社内 LAN にあります。外からの通信は NAT（ルータ）で止まるので届きません。公開するサーバは DMZ に置きます。");
  if (!sim.firewallOnline || sim.webServerZone !== "dmz")
    return run.stop("Webサーバへの道がありません。ONU → ファイアウォール → DMZ の順につなぎます。");
  run.path = ["customer", "internet", "onu", "firewall"];
  run.pass("インターネットからファイアウォールに届きました。");
  if (!state.firewall.inHttps && !state.firewall.inOther)
    return run.stop("ファイアウォールが DMZ への HTTPS（443）を許可していません。");
  run.pass("ファイアウォール：インターネット → DMZ の 443 番ポートは許可。");
  run.path = ["customer", "internet", "onu", "firewall", "webServer"];
  return run.reached("自社Webサイトが表示されました。");
}

function attackSsh(state: LabState, sim: Sim): TestResult {
  const run = new Run("attack-ssh", "攻撃者 → Webサーバに SSH（22）");
  run.path = ["attacker", "internet", "onu"];
  if (!isPresent(state, "webServer") || sim.webServerZone === null) return run.blocked("狙えるWebサーバがありません。");
  if (sim.webServerZone === "lan") {
    run.path = ["attacker", "internet", "onu", sim.routerVia === "firewall" ? "firewall" : "router"];
    return run.blocked("社内 LAN の機器には、外から直接届きません（NAT が止める）。");
  }
  run.path = ["attacker", "internet", "onu", "firewall"];
  if (state.firewall.inOther) {
    run.path = ["attacker", "internet", "onu", "firewall", "webServer"];
    return run.breached(
      "ファイアウォールが DMZ への全ポートを許可しているため、管理用の SSH（22）まで外から届きました。必要なポート（443）だけを許可しましょう。",
      "Webサーバの管理口まで届いてしまいました。",
    );
  }
  return run.blocked("ファイアウォールが 22 番ポートを止めました（許可しているのは 443 だけ）。");
}

function attackFile(state: LabState, sim: Sim): TestResult {
  const run = new Run("attack-file", "攻撃者 → ファイルサーバ（445）");
  run.path = ["attacker", "internet", "onu"];
  if (!isPresent(state, "fileServer") || sim.fileServerZone === null) return run.blocked("狙えるファイルサーバがありません。");
  if (sim.fileServerZone === "dmz") {
    run.path = ["attacker", "internet", "onu", "firewall"];
    if (state.firewall.inOther) {
      run.path = ["attacker", "internet", "onu", "firewall", "fileServer"];
      return run.breached("ファイルサーバが DMZ にあり、全ポートが許可されているため、社内の共有ファイルに外から届きました。");
    }
    return run.blocked(
      "ファイアウォールが 445 番を止めました。ただし、社内用のファイルサーバは DMZ ではなく社内 LAN に置くべきです。",
    );
  }
  run.path = ["attacker", "internet", "onu", sim.routerVia === "firewall" ? "firewall" : "router"];
  return run.blocked(
    sim.routerVia === "firewall"
      ? "ファイアウォールが社内 LAN への接続を止めました（外から始まる通信は許可していない）。"
      : "ルータの NAT が、外から始まる通信を社内へ通しませんでした。",
  );
}

function outsiderWifi(state: LabState, sim: Sim): TestResult {
  const run = new Run("outsider-wifi", "近所の人が Wi-Fi に接続");
  run.path = ["outsider"];
  if (!isPresent(state, "ap") || !sim.wifiJoined) return run.blocked("無線APが動いていないので、つなぐ先がありません。");
  run.path = ["outsider", "ap"];
  if (state.ap.security === "none") {
    run.path = join(["outsider"], route(state, "ap", "router", l2) ?? ["ap"]);
    return run.breached(
      `「${state.ap.ssid}」は暗号化なし（パスワードなし）なので、誰でも接続でき、通信も盗み見られます。WPA2 か WPA3 にしましょう。`,
      "部外者が社内ネットワークに入れてしまいました。",
    );
  }
  return run.blocked(
    `「${state.ap.ssid}」は ${state.ap.security === "wpa3" ? "WPA3" : "WPA2"} で暗号化されています。パスワードを知らないので接続できません。`,
  );
}

export function runTest(state: LabState, id: TestId, sim = simulate(state)): TestResult {
  const title = TESTS.find((t) => t.id === id)!.title;
  switch (id) {
    case "ping-ab":
      return ping(state, sim, id, title, "pc-a", "pc-b");
    case "ping-ad":
      return ping(state, sim, id, title, "pc-a", "pc-d");
    case "ping-file":
      return ping(state, sim, id, title, "pc-c", "fileServer");
    case "web-pc":
      return web(state, sim, id, title, "pc-a");
    case "web-laptop":
      return web(state, sim, id, title, "laptop");
    case "customer-web":
      return customerWeb(state, sim);
    case "attack-ssh":
      return attackSsh(state, sim);
    case "attack-file":
      return attackFile(state, sim);
    case "outsider-wifi":
      return outsiderWifi(state, sim);
  }
}

// ---------------------------------------------------------------------------
// 操作（すべて新しい state を返す）
// ---------------------------------------------------------------------------

export function place(state: LabState, kind: PlaceableKind, slot: string): LabState {
  return { ...state, placed: { ...state.placed, [kind]: slot } };
}

export function removeDevice(state: LabState, kind: PlaceableKind): LabState {
  const placed = { ...state.placed };
  delete placed[kind];
  return { ...state, placed, links: state.links.filter((l) => l.a !== kind && l.b !== kind) };
}

export function connect(state: LabState, a: DeviceId, b: DeviceId): LabState {
  if (!canConnect(state, a, b).ok) return state;
  return { ...state, links: [...state.links, { a, b }] };
}

export function disconnect(state: LabState, a: DeviceId, b: DeviceId): LabState {
  const key = linkKey({ a, b });
  return { ...state, links: state.links.filter((l) => linkKey(l) !== key) };
}
