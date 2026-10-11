"use client";

import dynamic from "next/dynamic";
import { Scene3DGate, Scene3DLoading } from "../scene3d/Scene3DGate";
import { NetworkDevicesDioramaScene } from "./NetworkDevicesDioramaScene";
import type { NetDevSceneProps } from "./netdevTypes";

// ネットワーク機器の模型の入口。WebGL2 が使える端末では Blender で作った「動く3D」（three.js）を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D 模型（NetworkDevicesDioramaScene）を出す。
// 3D は three.js ごと別チャンクにして、この図解を開いたときだけ読み込む。

const NetDevScene3D = dynamic(() => import("./NetDevScene3D"), {
  ssr: false,
  loading: () => <Scene3DLoading />,
});

/** 2.5D には吹き出しが無いので、いまの一言を模型の上に出す */
function FlatBubble({ bubble }: { bubble: NonNullable<NetDevSceneProps["phase"]>["bubble"] | undefined }) {
  if (!bubble) return null;
  const tone = bubble.tone === "danger" ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-sky-50 text-sky-900 ring-sky-200";
  return (
    <p className={`mb-2 rounded-lg px-3 py-1.5 text-center text-xs font-bold ring-1 ${tone}`} data-testid="netdev-bubble" data-target={bubble.target}>
      {bubble.text}
    </p>
  );
}

export function NetDevScene(props: NetDevSceneProps) {
  return (
    <Scene3DGate
      name="NetDevScene3D"
      flat={
        <>
          <FlatBubble bubble={props.phase?.bubble} />
          {/* 2.5D は機器ごとに一連の動きを流す。選び直し・もう一度見るで最初から */}
          <NetworkDevicesDioramaScene mode={props.mode} runKey={props.epoch ?? 0} reducedMotion={props.reducedMotion} />
        </>
      }
      scene3d={<NetDevScene3D {...props} />}
    />
  );
}
