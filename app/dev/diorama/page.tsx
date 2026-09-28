import { notFound } from "next/navigation";
import DioramaPreview from "./DioramaPreview";

// 3D ジオラマ化した図解の確認用ページ（開発環境専用）。本番ビルドでは notFound を返す。
// ?t=<topicId> で本番と同じ体験コンポーネントをそのまま表示する（390px / 1280px の見た目確認用）。

export default async function DioramaPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const t = typeof params.t === "string" ? params.t : "tech-network-address";
  return <DioramaPreview topicId={t} />;
}
