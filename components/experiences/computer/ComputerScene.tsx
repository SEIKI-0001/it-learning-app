"use client";

import dynamic from "next/dynamic";
import { Scene3DGate, Scene3DLoading } from "../scene3d/Scene3DGate";
import { ComputerDioramaScene } from "./ComputerDioramaScene";
import type { ComputerSceneProps } from "./computerTypes";

// CPU・メモリ・ストレージの模型の入口。WebGL が使える端末では Blender で作った「動く3D」（three.js）を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D 模型（ComputerDioramaScene）を出す。
// 3D は three.js ごと別チャンクにして、この図解を開いたときだけ読み込む。

const ComputerScene3D = dynamic(() => import("./ComputerScene3D"), {
  ssr: false,
  loading: () => <Scene3DLoading />,
});

/** 2.5D には吹き出しが無いので、いまの一言を模型の上に出す */
function FlatCaption({ caption }: { caption: ComputerSceneProps["caption"] }) {
  if (!caption) return null;
  const tone = caption.tone === "lost" ? "bg-rose-50 text-rose-800 ring-rose-200" : caption.tone === "safe" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-sky-50 text-sky-900 ring-sky-200";
  return (
    <p className={`mb-2 rounded-lg px-3 py-1.5 text-center text-xs font-bold ring-1 ${tone}`} data-testid="cc-caption" data-target={caption.target}>
      {caption.text}
    </p>
  );
}

export function ComputerScene(props: ComputerSceneProps & { forward?: boolean }) {
  return (
    <Scene3DGate
      name="ComputerScene3D"
      flat={
        <>
          <FlatCaption caption={props.caption} />
          <ComputerDioramaScene {...props} />
        </>
      }
      scene3d={<ComputerScene3D {...props} />}
    />
  );
}
