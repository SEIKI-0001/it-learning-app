"use client";

import dynamic from "next/dynamic";
import { Scene3DGate, Scene3DLoading } from "../scene3d/Scene3DGate";
import { WifiDioramaScene } from "./WifiDioramaScene";
import type { WifiSceneProps } from "./wifiStory";

// 無線LAN の模型の入口。WebGL2 が使える端末では Blender で作った「動く3D」のカフェ（three.js）を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D 模型（WifiDioramaScene）を出す。
// 3D は three.js ごと別チャンクにして、この図解を開いたときだけ読み込む。

const WifiScene3D = dynamic(() => import("./WifiScene3D"), {
  ssr: false,
  loading: () => <Scene3DLoading />,
});

export function WifiScene(props: WifiSceneProps) {
  return <Scene3DGate name="WifiScene3D" flat={<WifiDioramaScene {...props} />} scene3d={<WifiScene3D {...props} />} />;
}
