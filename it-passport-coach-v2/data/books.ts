import type { Book } from "@/types/content";

export const books: Book[] = [
  {
    id: "generic",
    title: "手持ちのITパスポート参考書",
    notes: "章番号が違っても、テーマ名で探せるように範囲メモを返します。"
  },
  {
    id: "yasashii",
    title: "いちばんやさしいITパスポート",
    notes: "初学者向けの説明が多い参考書を想定した対応メモです。"
  },
  {
    id: "speed",
    title: "短期集中 ITパスポート",
    notes: "試験直前に用語確認と過去問演習を厚めにする参考書を想定します。"
  }
];

export function getBookTitle(bookId: string): string {
  return books.find((book) => book.id === bookId)?.title ?? books[0].title;
}
