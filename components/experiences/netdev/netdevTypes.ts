// ネットワーク機器の図解の型と場面の台本（NetworkDevicesExperience と NetDevScene3D で共有）。
// 機器を1つ選ぶと、2〜3の場面が自動で進む。場面ごとに「運ぶ物の動き」「光る配線」「吹き出し（35文字以内）」が1つずつ変わる。

export type NetDevMode = "hub" | "switch" | "router" | "ap" | "repeater" | "gateway";

/** 模型の中の場所（機器・PC・外の世界） */
export type NetNodeId =
  | "pcA"
  | "pcB"
  | "pcC"
  | "pcD"
  | "hub" // 真ん中の集線装置（ハブ／スイッチを差し替える）
  | "router"
  | "internet"
  | "ap"
  | "laptop"
  | "repeater"
  | "far" // 別棟の倉庫の PC
  | "gateway"
  | "factory";

/** 吹き出しが指せる所。longCable＝倉庫までの長いケーブルの途中 */
export type BubbleTarget = NetNodeId | "longCable";

/** 配線（Blender の模型のケーブルと同じ道）。air＝ノートPC と AP の間の電波 */
export type NetLaneId = "wA" | "wB" | "wC" | "wD" | "wR" | "wI" | "wAP" | "wG" | "wX" | "wL" | "wF" | "air";

/** on＝データが通る（青）、warn＝関係ない所へ流れた（橙）、weak＝弱った信号（薄い青）、alt＝別の通信方式（琥珀） */
export type LaneTone = "on" | "warn" | "weak" | "alt";

export const LANE_ENDS: Record<NetLaneId, [NetNodeId, NetNodeId]> = {
  wA: ["pcA", "hub"],
  wB: ["pcB", "hub"],
  wC: ["pcC", "hub"],
  wD: ["pcD", "hub"],
  wR: ["hub", "router"],
  wI: ["router", "internet"],
  wAP: ["ap", "hub"],
  wG: ["hub", "gateway"],
  wX: ["gateway", "factory"],
  wL: ["hub", "repeater"],
  wF: ["repeater", "far"],
  air: ["laptop", "ap"],
};

/**
 * 運ぶ物。frame/packet＝データの小包（青）、copy＝関係ない相手へのコピー（橙）、
 * weak＝弱っていく信号、signal＝元の強さの信号、converted＝別の方式へ変換した書類（琥珀）
 */
export type TokenKind = "frame" | "copy" | "packet" | "weak" | "signal" | "converted";

export type NetToken = {
  id: "t1" | "t2" | "t3";
  /** 通る場所の並び。1つだけならその場に止まる */
  route: NetNodeId[];
  kind: TokenKind;
  /** 運ぶ物の札。動いている間だけ出す（pin なら止まっていても出す） */
  tag?: string;
  pin?: boolean;
};

/** 画面に映すもの */
export type NetScreen = "idle" | "send" | "recv" | "drop" | "run";
export type ScreenOwner = "A" | "B" | "C" | "D" | "far" | "laptop" | "factory";

export type NetBubble = { target: BubbleTarget; text: string; tone?: "danger" };

export type NetPhase = {
  bubble: NetBubble;
  tokens: NetToken[];
  lanes: Partial<Record<NetLaneId, LaneTone>>;
  /** 光らせる場所（働いている機器・PC） */
  active: NetNodeId[];
  screens?: Partial<Record<ScreenOwner, NetScreen>>;
  /** スイッチの MACアドレス表を出す */
  macTable?: boolean;
};

export type NetDevSceneProps = {
  mode: NetDevMode | null;
  phase: NetPhase | null;
  /** 最初の場面か（運ぶ物の札を、止まっていても出す） */
  firstPhase?: boolean;
  /** 「もう一度見る」・機器の選び直しで、同じ場面を最初から動かし直すための番号 */
  epoch?: number;
  /** 一時停止中（模型の動きもその場で止める） */
  paused?: boolean;
  reducedMotion: boolean;
};

const say = (target: BubbleTarget, text: string, danger = false): NetBubble => (danger ? { target, text, tone: "danger" } : { target, text });

export const PHASES: Record<NetDevMode, NetPhase[]> = {
  hub: [
    {
      bubble: say("pcA", "PC-AからPC-Cへデータを送る"),
      tokens: [{ id: "t1", route: ["pcA", "hub"], kind: "frame", tag: "宛先：PC-C" }],
      lanes: { wA: "on" },
      active: ["pcA", "hub"],
      screens: { A: "send" },
    },
    {
      bubble: say("hub", "ハブは宛先を見ず、全部のポートへ流す"),
      tokens: [
        { id: "t1", route: ["hub", "pcC"], kind: "frame" },
        { id: "t2", route: ["hub", "pcB"], kind: "copy" },
        { id: "t3", route: ["hub", "pcD"], kind: "copy" },
      ],
      lanes: { wA: "on", wC: "on", wB: "warn", wD: "warn" },
      active: ["hub"],
      screens: { A: "send" },
    },
    {
      bubble: say("pcB", "関係ないPC-B・Dにも届いてしまう", true),
      tokens: [
        { id: "t1", route: ["pcC"], kind: "frame" },
        { id: "t2", route: ["pcB"], kind: "copy" },
        { id: "t3", route: ["pcD"], kind: "copy" },
      ],
      lanes: { wA: "on", wC: "on", wB: "warn", wD: "warn" },
      active: ["pcB", "pcC", "pcD"],
      screens: { C: "recv", B: "drop", D: "drop" },
    },
  ],
  switch: [
    {
      bubble: say("pcA", "同じくPC-AからPC-Cへデータを送る"),
      tokens: [{ id: "t1", route: ["pcA", "hub"], kind: "frame", tag: "宛先：PC-C" }],
      lanes: { wA: "on" },
      active: ["pcA", "hub"],
      screens: { A: "send" },
    },
    {
      bubble: say("hub", "MACアドレス表で「Cはポート3」と調べる"),
      tokens: [{ id: "t1", route: ["hub"], kind: "frame" }],
      lanes: { wA: "on" },
      active: ["hub"],
      screens: { A: "send" },
      macTable: true,
    },
    {
      bubble: say("pcC", "PC-Cにだけ届く。B・Dには流れない"),
      tokens: [{ id: "t1", route: ["hub", "pcC"], kind: "frame" }],
      lanes: { wA: "on", wC: "on" },
      active: ["hub", "pcC"],
      screens: { C: "recv" },
      macTable: true,
    },
  ],
  router: [
    {
      bubble: say("pcA", "社外のサイトへ。宛先のIPアドレスを付けて送る"),
      tokens: [{ id: "t1", route: ["pcA", "hub", "router"], kind: "packet", tag: "宛先IP 203.0.113.10" }],
      lanes: { wA: "on", wR: "on" },
      active: ["pcA", "router"],
      screens: { A: "send" },
    },
    {
      bubble: say("router", "ルータが宛先IPを見て、外への道を選ぶ"),
      tokens: [{ id: "t1", route: ["router"], kind: "packet", tag: "宛先IP 203.0.113.10", pin: true }],
      lanes: { wA: "on", wR: "on" },
      active: ["router"],
    },
    {
      bubble: say("internet", "社内LANを出て、インターネットへ"),
      tokens: [{ id: "t1", route: ["router", "internet"], kind: "packet" }],
      lanes: { wR: "on", wI: "on" },
      active: ["router", "internet"],
    },
  ],
  ap: [
    {
      bubble: say("laptop", "ノートPCは、電波でAPへ送る"),
      tokens: [{ id: "t1", route: ["laptop", "ap"], kind: "frame", tag: "宛先：PC-B" }],
      lanes: { air: "on" },
      active: ["laptop", "ap"],
      screens: { laptop: "send" },
    },
    {
      bubble: say("ap", "APから先は有線。無線の端末も社内LANの一員"),
      tokens: [{ id: "t1", route: ["ap", "hub", "pcB"], kind: "frame" }],
      lanes: { air: "on", wAP: "on", wB: "on" },
      active: ["ap", "pcB"],
      screens: { laptop: "send", B: "recv" },
    },
  ],
  repeater: [
    {
      bubble: say("longCable", "別棟までケーブルが長く、信号が弱っていく"),
      tokens: [{ id: "t1", route: ["hub", "repeater"], kind: "weak", tag: "信号" }],
      lanes: { wL: "weak" },
      active: ["hub"],
    },
    {
      bubble: say("repeater", "リピータが元の強さに戻して、先へ送る"),
      tokens: [{ id: "t1", route: ["repeater", "far"], kind: "signal", tag: "元の強さ" }],
      lanes: { wL: "weak", wF: "on" },
      active: ["repeater", "far"],
      screens: { far: "recv" },
    },
  ],
  gateway: [
    {
      bubble: say("pcA", "工場の機械へ。社内の方式（TCP/IP）で送る"),
      tokens: [{ id: "t1", route: ["pcA", "hub", "gateway"], kind: "packet", tag: "社内の方式" }],
      lanes: { wA: "on", wG: "on" },
      active: ["pcA", "gateway"],
      screens: { A: "send" },
    },
    {
      bubble: say("gateway", "ゲートウェイが、工場の方式に変換する"),
      tokens: [{ id: "t1", route: ["gateway"], kind: "converted", tag: "工場の方式に変換", pin: true }],
      lanes: { wA: "on", wG: "on" },
      active: ["gateway"],
    },
    {
      bubble: say("factory", "方式の違う機械にも、正しく伝わる"),
      tokens: [{ id: "t1", route: ["gateway", "factory"], kind: "converted" }],
      lanes: { wX: "alt" },
      active: ["gateway", "factory"],
      screens: { factory: "run" },
    },
  ],
};

/**
 * いまの場面で名札を出す場所。光っている所・吹き出しが指す所・運ぶ物の行き先だけにし、
 * 場面に関係ない名札は出さない。機器を選ぶ前は、機器と外の世界の名札だけを地図として出す。
 */
export const OVERVIEW_LABELS: NetNodeId[] = ["hub", "router", "internet", "ap", "repeater", "far", "gateway", "factory"];

export function shownLabels(phase: NetPhase | null): Set<NetNodeId> {
  if (!phase) return new Set(OVERVIEW_LABELS);
  const shown = new Set<NetNodeId>(phase.active);
  if (phase.bubble.target !== "longCable") shown.add(phase.bubble.target);
  for (const t of phase.tokens) shown.add(t.route[t.route.length - 1]);
  return shown;
}
