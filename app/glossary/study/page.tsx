import PageHeader from "@/components/ui/PageHeader";
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
