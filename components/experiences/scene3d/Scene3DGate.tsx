"use client";

import { Component, Suspense, useSyncExternalStore, type ReactNode } from "react";

// 動く3D模型の入口（CPU・サイバー攻撃で共通）。WebGL2 が使える端末では 3D を、
// 使えない端末・読み込みに失敗したときは従来の 2.5D 模型（flat）を出す。
// three.js（r163〜）は WebGL2 が必須なので、WebGL1 しか無い端末は最初から 2.5D にする。

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

export function Scene3DLoading() {
  return (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl bg-[#d9dde3] text-xs font-bold text-gray-500 sm:aspect-[16/11]" role="status" data-scene3d-loading="">
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
class Fallback extends Component<{ fallback: ReactNode; name: string; children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message.slice(0, 80) || e.name : String(e).slice(0, 80) };
  }
  componentDidCatch(e: unknown) {
    console.error(`[${this.props.name}] 3D表示に失敗したため 2.5D に切り替え`, e);
  }
  render() {
    return this.state.error !== null ? <FlatWithReason reason={`3D読み込み失敗: ${this.state.error}`}>{this.props.fallback}</FlatWithReason> : this.props.children;
  }
}

/** name はコンソールに出す模型の名前。scene3d は dynamic import した 3D 模型の要素 */
export function Scene3DGate({ name, flat, scene3d }: { name: string; flat: ReactNode; scene3d: ReactNode }) {
  const webgl = useSyncExternalStore(noop, hasWebGL2, () => null);
  // サーバー描画中（null）は従来の模型。ブラウザで WebGL2 が無いと分かったら理由を添える
  if (webgl === null) return <>{flat}</>;
  if (!webgl) return <FlatWithReason reason="この端末・ブラウザは WebGL2 に未対応">{flat}</FlatWithReason>;
  return (
    <Fallback fallback={flat} name={name}>
      <Suspense fallback={<Scene3DLoading />}>{scene3d}</Suspense>
    </Fallback>
  );
}
