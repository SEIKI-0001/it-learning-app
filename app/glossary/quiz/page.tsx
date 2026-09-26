import PageHeader from "@/components/ui/PageHeader";
import QuizDeck, { type QuizMode } from "@/components/wordlist/QuizDeck";
import BottomNav from "@/components/BottomNav";
import RecordingLockNotice from "@/components/billing/RecordingLockNotice";
import { getWord } from "@/lib/wordlist";
import { getTopic } from "@/lib/content";
import { topicWordIds } from "@/data/topicWordLinks";
import { MAX_ACTIVITY_IDS } from "@/lib/todayActivitySpec";

// 英略語の4択確認モード。?mode=all|weak|today で出題プールを切り替える。
// ?mode=task&ids=dns,dhcp は Today の単語タスク: 指定した単語だけを1語1問で出す
// （&from=today&task=<Todayのタスクid>&topicId=<関連語の元トピック> を添える）。
// Next.js 16 では searchParams は Promise なので await が必須（AGENTS.md・docs 準拠）。

const MODE_TITLE: Record<QuizMode, string> = {
  all: "4択確認",
  weak: "苦手の4択確認",
  today: "今日の4択確認",
  task: "今日の用語4択",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseMode(value: string | string[] | undefined): QuizMode {
  const v = first(value);
  if (v === "all" || v === "weak" || v === "today" || v === "task") return v;
  return "all";
}

/** 実在する単語 id だけを、重複なしで取り出す（上限は Today のタスクの spec と同じ）。 */
function parseIds(value: string | string[] | undefined): string[] {
  const raw = first(value) ?? "";
  const ids = raw.split(",").map((id) => id.trim()).filter((id) => getWord(id) !== undefined);
  return [...new Set(ids)].slice(0, MAX_ACTIVITY_IDS);
}

type SearchParams = {
  mode?: string | string[];
  ids?: string | string[];
  from?: string | string[];
  task?: string | string[];
  topicId?: string | string[];
};

export default async function WordlistQuizPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const mode = parseMode(params.mode);
  const ids = mode === "task" ? parseIds(params.ids) : [];
  const fromToday = first(params.from) === "today";
  const todayTaskId = mode === "task" && fromToday ? first(params.task) ?? null : null;
  const topic = mode === "task" ? getTopic(first(params.topicId) ?? "") : undefined;
  // 「○○の関連用語」と名乗るのは、そのトピックの単語だけを出すときに限る。
  const topicOnly = topic !== undefined && ids.length > 0
    && ids.every((id) => topicWordIds(topic.id).includes(id));
  const title = topicOnly ? `${topic.title}の関連用語` : MODE_TITLE[mode];

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={fromToday ? { href: "/today", label: "今日の学習" } : { href: "/glossary", label: "単語帳" }}
        title={title}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <RecordingLockNotice variant="compact" className="mb-3" />
        <QuizDeck
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
