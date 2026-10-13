import type { ReactNode } from "react";

// モバイル通信の図解の中身（2.5D の模型 MobileDioramaScene と 3D の MobileScene3D で共通）。

export type MobileMode = "5g" | "tether" | "mvno";
/** 一言が指す相手：基地局／あなたのスマホ／格安SIMの会社 */
export type MobileFocus = "tower" | "phone" | "mvno";
/** 5G で同時につながる機器 */
export type MobileDevice = "phone" | "car" | "cam" | "phone2";

export type MobileSceneProps = { mode: MobileMode; reducedMotion: boolean };

export const MOBILE_DEVICES: { id: MobileDevice; name: string }[] = [
  { id: "phone", name: "スマホ" },
  { id: "car", name: "車" },
  { id: "cam", name: "監視カメラ" },
  { id: "phone2", name: "歩く人のスマホ" },
];

// モードごとの一言（40字以内）と、それが指す物
export const MOBILE_CAPTION: Record<MobileMode, { text: ReactNode; tone: "info"; focus: MobileFocus }> = {
  "5g": { text: <><b>5G</b>は高速大容量・低遅延・多数同時接続。車もカメラも</>, tone: "info", focus: "tower" },
  tether: { text: <>スマホが親機になり、SIMなしのPCをつなぐ（<b>テザリング</b>）</>, tone: "info", focus: "phone" },
  mvno: { text: <><b>MVNO</b>は基地局を持たず、大手(MNO)の回線を借りる</>, tone: "info", focus: "mvno" },
};

/** その機器への電波が、いま使われているか（5G は全部、テザリング・MVNO はあなたのスマホだけ） */
export function radioOn(mode: MobileMode, id: MobileDevice) {
  return mode === "5g" || id === "phone";
}
