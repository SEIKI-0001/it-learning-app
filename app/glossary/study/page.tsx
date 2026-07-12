import Link from "next/link";
import FlashcardDeck, {
  type StudyMode,
} from "@/components/wordlist/FlashcardDeck";
import BottomNav from "@/components/BottomNav";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";

// 英略語のカード学習モード。?mode=today|weak|all で出題プールを切り替える。
// Next.js 16 では searchParams は Promise なので await が必須（AGENTS.md・docs 準拠）。

const MODE_TITLE: Record<StudyMode, string> = {
  today: "今日の復習",
  weak: "苦手だけ復習",
  all: "すべてから学習",
};

function parseMode(value: string | string[] | undefined): StudyMode {
  if (value === "today" || value === "weak" || value === "all") return value;
  return "all";
}

export default async function WordlistStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const { mode: rawMode } = await searchParams;
  const mode = parseMode(rawMode);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-2 pt-2 text-white">
        <div className="mx-auto flex w-full max-w-md md:max-w-2xl items-center gap-3">
          <Link href="/glossary" className="text-sm font-medium text-white/80">
            ←
          </Link>
          <h1 className="text-base font-extrabold">{MODE_TITLE[mode]}</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md md:max-w-2xl px-4 py-3">
        <RecordingLockNotice variant="compact" className="mb-3" />
        <FlashcardDeck mode={mode} />
      </div>

      <BottomNav />
    </main>
  );
}
