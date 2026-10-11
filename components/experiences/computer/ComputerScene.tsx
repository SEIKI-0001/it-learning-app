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

// three.js（r163〜）は WebGL2 が必須。WebGL1 しか無い端末は最初から 2.5D にする
let webglCache: boolean | null = null;
function hasWebGL2() {
  if (webglCache !== null) return webglCache;
  try {
    webglCache = !!document.createElement("canvas").getContext("webgl2");
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

/** 2.5D に切り替えたときは一言添える。理由は data-scene-fallback に残す（端末ごとの不具合を調べる手がかり） */
function FlatWithReason({ reason, children }: { reason: string; children: ReactNode }) {
  return (
    <div data-scene-fallback={reason}>
      {children}
      {/* 理由は data 属性とコンソールにだけ残し、画面には一言だけ出す */}
      <p className="mt-1 text-center text-[10px] text-gray-400" data-testid="scene3d-fallback">
        この端末では簡易表示になっています
      </p>
    </div>
  );
}

/** 3D の読み込み・描画で例外が出たら 2.5D に切り替える */
class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message.slice(0, 80) || e.name : String(e).slice(0, 80) };
  }
  componentDidCatch(e: unknown) {
    console.error("[ComputerScene3D] 3D表示に失敗したため 2.5D に切り替え", e);
  }
  render() {
    return this.state.error !== null ? <FlatWithReason reason={`3D読み込み失敗: ${this.state.error}`}>{this.props.fallback}</FlatWithReason> : this.props.children;
  }
}

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
  const webgl = useSyncExternalStore(noop, hasWebGL2, () => null);
  const flat = (
    <>
      <FlatCaption caption={props.caption} />
      <ComputerDioramaScene {...props} />
    </>
  );
  // サーバー描画中（null）は従来の模型。ブラウザで WebGL2 が無いと分かったら理由を添える
  if (webgl === null) return flat;
  if (!webgl) return <FlatWithReason reason="この端末・ブラウザは WebGL2 に未対応">{flat}</FlatWithReason>;
  return (
    <Fallback fallback={flat}>
      <Suspense fallback={<Loading />}>
        <ComputerScene3D {...props} />
      </Suspense>
    </Fallback>
  );
}
