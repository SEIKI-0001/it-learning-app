"use client";

import dynamic from "next/dynamic";
import { Scene3DGate, Scene3DLoading } from "../scene3d/Scene3DGate";
import { IotDioramaScene, type IotPhase } from "./IotDioramaScene";
import type { StageCaption } from "../scene/DioramaStage";

// IoT の模型の入口。WebGL2 が使える端末では Blender で作った「動く3D」（three.js）を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D 模型（IotDioramaScene）を出す。
// 3D は three.js ごと別チャンクにして、この図解を開いたときだけ読み込む。

export type IotFocus = "aircon" | "cloud";
export type IotSceneProps = {
  phase: IotPhase;
  forward: boolean;
  reducedMotion: boolean;
  caption?: (Omit<StageCaption, "at"> & { focus: IotFocus }) | null;
};

const IotScene3D = dynamic(() => import("./IotScene3D"), {
  ssr: false,
  loading: () => <Scene3DLoading />,
});

export function IotScene(props: IotSceneProps) {
  return <Scene3DGate name="IotScene3D" flat={<IotDioramaScene {...props} />} scene3d={<IotScene3D {...props} />} />;
}
