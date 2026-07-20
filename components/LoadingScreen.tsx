// 全画面ローディング。素のテキストではなくスピナー付きで「動いている」ことを伝える。
export default function LoadingScreen({ message = "読み込み中…" }: { message?: string }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 text-gray-500"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600 motion-reduce:animate-none"
      />
      <p className="text-sm">{message}</p>
    </main>
  );
}
