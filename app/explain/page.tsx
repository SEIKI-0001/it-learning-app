import type { Metadata } from "next";
import ExplainClient from "@/components/explain3d/ExplainClient";

// 3D模型で解説（β）。「〜の仕組みを解説して」に、模型を動かして答える。ログインして使う。β のあいだは検索に出さない。
export const metadata: Metadata = {
  title: "3D模型で解説（β）",
  description: "知りたい仕組みを入力すると、3D模型を動かしながら解説します。",
  robots: { index: false, follow: false },
};

export default function ExplainPage() {
  return <ExplainClient />;
}
