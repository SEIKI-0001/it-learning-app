"use client";

import dynamic from "next/dynamic";
import { Scene3DGate, Scene3DLoading } from "../scene3d/Scene3DGate";
import type { StageCaption } from "../scene/DioramaStage";
import type { NodeKey, TermKey } from "./TradeFlowMap";
import { TradeTownScene } from "./TradeTownScene";

// 取引マップの模型の入口。WebGL2 が使える端末では Blender で作った「動く3D」の街（three.js）を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D の街（TradeTownScene）を出す。
// 3D は three.js ごと別チャンクにして、この図解を開いたときだけ読み込む。

export type TradeSceneProps = {
  sel: TermKey | null;
  runKey: number;
  reducedMotion: boolean;
  /** 模型の上端に出す一言。focus を渡すとその登場人物へ線を引く */
  caption?: (Omit<StageCaption, "at"> & { focus?: NodeKey }) | null;
};

const TradeScene3D = dynamic(() => import("./TradeScene3D"), {
  ssr: false,
  loading: () => <Scene3DLoading />,
});

export function TradeScene(props: TradeSceneProps) {
  return <Scene3DGate name="TradeScene3D" flat={<TradeTownScene {...props} />} scene3d={<TradeScene3D {...props} />} />;
}
