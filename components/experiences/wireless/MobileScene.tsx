"use client";

import dynamic from "next/dynamic";
import { Scene3DGate, Scene3DLoading } from "../scene3d/Scene3DGate";
import { MobileDioramaScene } from "./MobileDioramaScene";
import type { MobileSceneProps } from "./mobileStory";

// モバイル通信の模型の入口。WebGL2 が使える端末では Blender で作った「動く3D」の街角（three.js）を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D 模型（MobileDioramaScene）を出す。
// 3D は three.js ごと別チャンクにして、この図解を開いたときだけ読み込む。

const MobileScene3D = dynamic(() => import("./MobileScene3D"), {
  ssr: false,
  loading: () => <Scene3DLoading />,
});

export function MobileScene(props: MobileSceneProps) {
  return <Scene3DGate name="MobileScene3D" flat={<MobileDioramaScene {...props} />} scene3d={<MobileScene3D {...props} />} />;
}
