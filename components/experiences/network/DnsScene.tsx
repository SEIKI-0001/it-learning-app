"use client";

import dynamic from "next/dynamic";
import { Scene3DGate, Scene3DLoading } from "../scene3d/Scene3DGate";
import { DnsDioramaScene } from "./DnsDioramaScene";
import type { DnsSceneProps } from "./dnsTypes";

// IPアドレス・DNS の模型の入口。WebGL2 が使える端末では Blender で作った「動く3D」（three.js）を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D 模型（DnsDioramaScene）を出す。
// 3D は three.js ごと別チャンクにして、この図解を開いたときだけ読み込む。

const DnsScene3D = dynamic(() => import("./DnsScene3D"), {
  ssr: false,
  loading: () => <Scene3DLoading />,
});

export function DnsScene(props: DnsSceneProps) {
  return <Scene3DGate name="DnsScene3D" flat={<DnsDioramaScene {...props} />} scene3d={<DnsScene3D {...props} />} />;
}
