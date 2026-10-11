// CPU・メモリ・ストレージの図解の型と文書の中身（ComputerCoreExperience と ComputerDioramaScene で共有）。

export type PartId = "storage" | "memory" | "cpu";

export type BusId = "load" | "bus" | "save";

export type DocVersion = 1 | 2;

export type PartState = "idle" | "sending" | "active" | "error" | "disabled";

export const DOC_TEXT: Record<DocVersion, string> = { 1: "売上 100万円", 2: "売上 120万円" };

export type WorkDoc = {
  spot: "storage" | "memory";
  version: DocVersion;
  /** clean=保存版と同じ / dirty=未保存の編集あり / saved=今保存した / vanished=電源OFFで消えた */
  status: "clean" | "dirty" | "saved" | "vanished";
};

/** 吹き出しを出す対象（3つの部品＋モニター・キーボード） */
export type CaptionTarget = PartId | "monitor" | "keyboard";

/** いま起きていることを1つだけ伝える短い吹き出し（35文字以内） */
export type SceneCaption = {
  target: CaptionTarget;
  text: string;
  /** lost=失った（赤）/ safe=残った（緑）。ふだんは指定しない */
  tone?: "lost" | "safe";
};

export type ComputerSceneProps = {
  nodes: Record<PartId, PartState>;
  lanes: Partial<Record<BusId, "active" | "idle">>;
  stored: DocVersion;
  storedFlash: boolean;
  doc: WorkDoc | null;
  packet: { spot: PartId; text: string; kind: BusId } | null;
  power: "on" | "off";
  reducedMotion: boolean;
  /** 対象物の近くに出す短い説明（無ければ出さない） */
  caption?: SceneCaption | null;
  /** 「もう一度見る」などで同じ場面を最初から動かし直すための番号 */
  epoch?: number;
  /** 一時停止中（模型の動きもその場で止める） */
  paused?: boolean;
};

/** 配線の両端の部品（load/save＝ストレージ⇄メモリ、bus＝メモリ⇄CPU） */
const BUS_ENDS: Record<BusId, PartId[]> = { load: ["storage", "memory"], save: ["storage", "memory"], bus: ["memory", "cpu"] };

/**
 * いまの場面で部品名の札を出す部品。働いている部品・光っている配線の両端・吹き出しが指す部品だけにし、
 * 場面に関係ない札は出さない。モニター・キーボードの場面では部品の札を出さない。
 * 電源OFFの実験はメモリ（消える）とストレージ（残る）を比べるので、その2つを出す。
 */
export function shownPartLabels({ nodes, lanes, power, caption }: Pick<ComputerSceneProps, "nodes" | "lanes" | "power" | "caption">): Set<PartId> {
  if (power === "off") return new Set<PartId>(["storage", "memory"]);
  if (caption?.target === "monitor" || caption?.target === "keyboard") return new Set();
  const shown = new Set<PartId>();
  for (const id of Object.keys(nodes) as PartId[]) if (nodes[id] !== "idle" && nodes[id] !== "disabled") shown.add(id);
  for (const id of Object.keys(lanes) as BusId[]) if (lanes[id] === "active") BUS_ENDS[id].forEach((p) => shown.add(p));
  if (caption) shown.add(caption.target);
  return shown;
}
