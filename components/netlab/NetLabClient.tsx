"use client";

import dynamic from "next/dynamic";

// 模型は端末ごとの保存（localStorage）と画面の大きさに合わせて描くので、サーバでは描かない。
const NetLab = dynamic(() => import("./NetLab"), {
  ssr: false,
  loading: () => <div className="mx-auto mt-24 max-w-md text-center text-sm text-gray-500">模型を準備しています…</div>,
});

export default NetLab;
