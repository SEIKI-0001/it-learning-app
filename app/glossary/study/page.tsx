import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import FlashcardDeck, {
  type StudyMode,
} from "@/components/wordlist/FlashcardDeck";
import BottomNav from "@/components/BottomNav";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";

// 英略語のカード学習モード（単語帳の自由学習）。?mode=today|weak|all で出題プールを切り替える。
// Today の単語タスクはカード学習（覚えた/あいまいの自己申告）ではなく4択で正誤を取るので、
// 以前 Today が出していた ?mode=task&ids=... のリンクは /glossary/quiz へそのまま送る。
// Next.js 16 では searchParams は Promise なので await が必須（AGENTS.md・docs 準拠）。

const MODE_TITLE: Record<StudyMode, string> = {
  today: "今日の復習",
  weak: "苦手だけ復習",
  all: "すべてから学習",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseMode(value: string | string[] | undefined): StudyMode {
  const v = first(value);
  if (v === "today" || v === "weak" || v === "all") return v;
  return "all";
}

export default async function WordlistStudyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  if (first(params.mode) === "task") {
    const query = new URLSearchParams();
    for (const key of ["mode", "ids", "from", "task", "topicId"]) {
      const value = first(params[key]);
      if (value !== undefined) query.set(key, value);
    }
    redirect(`/glossary/quiz?${query.toString()}`);
  }
  const mode = parseMode(params.mode);

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/glossary", label: "単語帳" }}
        title={MODE_TITLE[mode]}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <RecordingLockNotice variant="compact" className="mb-3" />
        <FlashcardDeck mode={mode} />
      </div>

      <BottomNav />
    </main>
  );
}
