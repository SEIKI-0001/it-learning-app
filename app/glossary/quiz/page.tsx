import Link from "next/link";
import QuizDeck, { type QuizMode } from "@/components/wordlist/QuizDeck";
import BottomNav from "@/components/BottomNav";

// 英略語の4択確認モード。?mode=all|weak|today で出題プールを切り替える。
// Next.js 16 では searchParams は Promise なので await が必須（AGENTS.md・docs 準拠）。

const MODE_TITLE: Record<QuizMode, string> = {
  all: "4択確認",
  weak: "苦手の4択確認",
  today: "今日の4択確認",
};

function parseMode(value: string | string[] | undefined): QuizMode {
  if (value === "all" || value === "weak" || value === "today") return value;
  return "all";
}

export default async function WordlistQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const { mode: rawMode } = await searchParams;
  const mode = parseMode(rawMode);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md">
          <Link href="/glossary" className="text-sm font-medium text-white/80">
            ← 単語帳
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold">{MODE_TITLE[mode]}</h1>
          <p className="mt-1 text-sm text-white/90">
            略語⇄意味・混同語の見分けを4択で確認しよう。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-4 py-6">
        <QuizDeck mode={mode} />
      </div>

      <BottomNav />
    </main>
  );
}
