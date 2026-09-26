import PageHeader from "@/components/ui/PageHeader";
import FlashcardDeck, {
  type StudyMode,
} from "@/components/wordlist/FlashcardDeck";
import BottomNav from "@/components/BottomNav";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";
import { getWord } from "@/lib/wordlist";
import { getTopic } from "@/lib/content";

// 英略語のカード学習モード。?mode=today|weak|all で出題プールを切り替える。
// ?mode=task&ids=dns,dhcp は Today などから「この単語だけ」を学ぶモード
// （&from=today&task=<Todayのタスクid>&topicId=<関連語の元トピック> を添える）。
// Next.js 16 では searchParams は Promise なので await が必須（AGENTS.md・docs 準拠）。

const MODE_TITLE: Record<StudyMode, string> = {
  today: "今日の復習",
  weak: "苦手だけ復習",
  all: "すべてから学習",
  task: "今日の用語",
};

/** 1回に学ぶ語数の上限（単語帳の1セッションと同じ）。 */
const TASK_MAX_WORDS = 8;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseMode(value: string | string[] | undefined): StudyMode {
  const v = first(value);
  if (v === "today" || v === "weak" || v === "all" || v === "task") return v;
  return "all";
}

/** 実在する単語 id だけを、重複なし・上限つきで取り出す。 */
function parseIds(value: string | string[] | undefined): string[] {
  const raw = first(value) ?? "";
  const ids = raw.split(",").map((id) => id.trim()).filter((id) => getWord(id) !== undefined);
  return [...new Set(ids)].slice(0, TASK_MAX_WORDS);
}

type SearchParams = {
  mode?: string | string[];
  ids?: string | string[];
  from?: string | string[];
  task?: string | string[];
  topicId?: string | string[];
};

export default async function WordlistStudyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const mode = parseMode(params.mode);
  const ids = mode === "task" ? parseIds(params.ids) : [];
  const fromToday = first(params.from) === "today";
  const todayTaskId = fromToday ? first(params.task) ?? null : null;
  const topic = mode === "task" ? getTopic(first(params.topicId) ?? "") : undefined;
  const title = topic ? `${topic.title}の関連用語` : MODE_TITLE[mode];

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={fromToday ? { href: "/today", label: "今日の学習" } : { href: "/glossary", label: "単語帳" }}
        title={title}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <RecordingLockNotice variant="compact" className="mb-3" />
        <FlashcardDeck
          mode={mode}
          ids={ids}
          todayTaskId={todayTaskId}
          topicId={topic?.id ?? null}
        />
      </div>

      <BottomNav />
    </main>
  );
}
