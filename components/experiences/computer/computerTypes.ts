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

export type ComputerSceneProps = {
  nodes: Record<PartId, PartState>;
  lanes: Partial<Record<BusId, "active" | "idle">>;
  stored: DocVersion;
  storedFlash: boolean;
  doc: WorkDoc | null;
  packet: { spot: PartId; text: string; kind: BusId } | null;
  power: "on" | "off";
  reducedMotion: boolean;
};
