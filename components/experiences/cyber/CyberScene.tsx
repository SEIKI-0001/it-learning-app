"use client";

import dynamic from "next/dynamic";
import { Scene3DGate, Scene3DLoading } from "../scene3d/Scene3DGate";
import { CyberDioramaScene } from "./CyberDioramaScene";
import type { CyberSceneProps } from "./cyberTypes";

// サイバー攻撃の模型の入口。WebGL が使える端末では Blender で作った「動く3D」（three.js）を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D 模型（CyberDioramaScene）を出す。
// 3D は three.js ごと別チャンクにして、この図解を開いたときだけ読み込む。

const CyberScene3D = dynamic(() => import("./CyberScene3D"), {
  ssr: false,
  loading: () => <Scene3DLoading />,
});

/** 2.5D には吹き出しが無いので、いまの一言を模型の上に出す */
function FlatBubble({ bubble }: { bubble: CyberSceneProps["bubble"] }) {
  if (!bubble) return null;
  const tone = bubble.tone === "danger" ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-sky-50 text-sky-900 ring-sky-200";
  return (
    <p className={`mb-2 rounded-lg px-3 py-1.5 text-center text-xs font-bold ring-1 ${tone}`} data-testid="cyber-bubble" data-target={bubble.target}>
      {bubble.text}
    </p>
  );
}

export function CyberScene(props: CyberSceneProps) {
  return (
    <Scene3DGate
      name="CyberScene3D"
      flat={
        <>
          <FlatBubble bubble={props.bubble} />
          <CyberDioramaScene {...props} previousStop={props.from ?? null} />
        </>
      }
      scene3d={<CyberScene3D {...props} />}
    />
  );
}
