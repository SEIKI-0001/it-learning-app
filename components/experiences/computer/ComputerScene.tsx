"use client";

import { Component, Suspense, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ComputerDioramaScene } from "./ComputerDioramaScene";
import type { ComputerSceneProps } from "./computerTypes";

// CPU・メモリ・ストレージの模型の入口。WebGL が使える端末では Blender で作った「動く3D」（three.js）を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D 模型（ComputerDioramaScene）を出す。
// 3D は three.js ごと別チャンクにして、この図解を開いたときだけ読み込む。

const ComputerScene3D = dynamic(() => import("./ComputerScene3D"), {
  ssr: false,
  loading: () => <Loading />,
});

let webglCache: boolean | null = null;
function hasWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}
const noop = () => () => {};

function Loading() {
  return (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl bg-[#d9dde3] text-xs font-bold text-gray-500 sm:aspect-[16/11]" role="status">
      3D模型を読み込み中…
    </div>
  );
}

/** 3D の読み込み・描画で例外が出たら 2.5D に切り替える */
class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function ComputerScene(props: ComputerSceneProps & { forward?: boolean }) {
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const flat = <ComputerDioramaScene {...props} />;
  if (!webgl) return flat;
  return (
    <Fallback fallback={flat}>
      <Suspense fallback={<Loading />}>
        <ComputerScene3D {...props} />
      </Suspense>
    </Fallback>
  );
}
