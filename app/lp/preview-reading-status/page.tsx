import type { Metadata } from "next";
import ReadingStatusPreview from "./ReadingStatusPreview";

// テスト環境での確認用（ログインすると本番ドメインへ戻されるため、サンプルの読了データで表示する）。
// main へ入れる前に、このディレクトリごと削除する。

export const metadata: Metadata = {
  title: "参考書の読了状況（確認用）",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ReadingStatusPreview />;
}
