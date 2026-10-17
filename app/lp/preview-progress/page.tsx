import type { Metadata } from "next";
import ProgressPreview from "./ProgressPreview";

// テスト環境での確認用（ログインすると本番ドメインへ戻されるため、/progress の実画面を
// この端末だけのサンプルデータで表示する）。main へ入れる前に、このディレクトリごと削除する。

export const metadata: Metadata = {
  title: "進捗（確認用）",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ProgressPreview />;
}
