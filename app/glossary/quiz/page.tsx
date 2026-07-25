import PageHeader from "@/components/ui/PageHeader";
import QuizDeck, { type QuizMode } from "@/components/wordlist/QuizDeck";
import BottomNav from "@/components/BottomNav";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";

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
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/glossary", label: "単語帳" }}
        title={MODE_TITLE[mode]}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <RecordingLockNotice variant="compact" className="mb-3" />
        <QuizDeck mode={mode} />
      </div>

      <BottomNav />
    </main>
  );
}
