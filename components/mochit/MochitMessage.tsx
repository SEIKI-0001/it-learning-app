// モチットのセリフ表示。描画方式（Rive/フォールバック）に依存しない共通部品。
export default function MochitMessage({ message }: { message: string }) {
  return <p className="text-sm leading-relaxed text-gray-700">{message}</p>;
}
