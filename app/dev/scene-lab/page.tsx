import { notFound } from "next/navigation";
import { LAB_VARIANTS, type LabVariant } from "@/components/experiences/https/lab/labTypes";
import SceneLab from "./SceneLab";

// 図解の表示手法ラボ（開発環境専用）。本番ビルドでは notFound を返す。
// 題材は「HTTPとHTTPS」の盗み見くらべ。内容は本番と同じで、描き方だけ3パターンを並べて比べる。
// ?v=current|a|b|c で初期表示のパターンを選べる（スクリーンショット用）。

export default async function SceneLabPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const v = typeof params.v === "string" ? params.v : "";
  const initial = (LAB_VARIANTS as readonly string[]).includes(v) ? (v as LabVariant) : "a";
  return <SceneLab initialVariant={initial} />;
}
