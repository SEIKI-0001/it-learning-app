import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/ui/PageHeader";
import OfficialDrillPicker from "@/components/pastExam/OfficialDrillPicker";
import OfficialDrillRunner from "@/components/pastExam/OfficialDrillRunner";
import { FIELD_LABELS, type TopicField } from "@/types/content";
import { getPublishedQuestions, getQuestionForDelivery } from "@/lib/questionBank";
import { isOfficialExamField } from "@/lib/questionBank/officialExamField";
import { toPastExamQuestionView } from "@/lib/pastExam/viewModel";
import {
  clampDrillCount,
  type DrillIndexEntry,
  type DrillSelectionStage,
} from "@/lib/pastExam/drillSelection";

// 公式過去問の部分演習（CP5 以降の Today から開く）。
//
//   ?stage=field-drill&field=technology&count=12 … 分野別
//   ?stage=mixed&count=15                          … 3分野混合
//   ?stage=random&count=25                         … ランダム
//   ?stage=retry-wrong&ids=...                     … 誤答の解き直し
//   &from=today&task=<Today のタスク id>          … Today から来たとき
//
// ids が無いときは、端末の回答履歴を使って出題する問題を選ぶ画面（OfficialDrillPicker）を出し、
// 選んだ ID を URL に載せて開き直す。ID が URL にあるので、再読み込みしても同じ問題のまま。
// 問題本文は必ず問題バンクから ID で引く（データは複製しない）。年度別100問は /past-exams/[year]。

export const metadata: Metadata = {
  title: "公式過去問の演習 | ITパスポート学習コーチ",
  description: "IPAが公開しているITパスポート試験の過去問を、分野別・ランダムに演習できます。",
};

type SearchParams = {
  stage?: string | string[];
  field?: string | string[];
  count?: string | string[];
  ids?: string | string[];
  from?: string | string[];
  task?: string | string[];
};

const STAGES: readonly DrillSelectionStage[] = ["field-drill", "mixed", "random", "retry-wrong"];
const MAX_IDS = 30;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function stageTitle(stage: DrillSelectionStage, field: TopicField | undefined): string {
  if (stage === "field-drill" && field) return `${FIELD_LABELS[field]}の公式問題`;
  if (stage === "mixed") return "3分野の公式問題";
  if (stage === "retry-wrong") return "過去問の誤答を解き直す";
  return "公式問題ランダム演習";
}

/** 部分演習の出題元（公開済みの公式過去問だけ）。本文は持たない軽い索引。 */
function buildIndex(): DrillIndexEntry[] {
  return getPublishedQuestions()
    .filter((q) => q.origin === "official_past" && q.official)
    .map((q) => ({
      id: q.id,
      field: q.official!.examField as TopicField,
      topicId: q.primaryTopicId,
    }));
}

export default async function PastExamDrillPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const rawStage = first(params.stage);
  const stage: DrillSelectionStage = STAGES.includes(rawStage as DrillSelectionStage)
    ? (rawStage as DrillSelectionStage)
    : "random";
  const rawField = first(params.field);
  const field = isOfficialExamField(rawField) ? rawField : undefined;
  const count = clampDrillCount(Number(first(params.count) ?? 10));
  const fromToday = first(params.from) === "today";
  const todayTaskId = fromToday ? first(params.task) ?? null : null;
  const ids = (first(params.ids) ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  // 年度別演習と同じ条件（公開済みの公式原文）で引き直す。条件に合わない ID は黙って落とす。
  const questions = [...new Set(ids)]
    .map((id) => getQuestionForDelivery(id, "official_past_exam"))
    .filter((q) => q !== undefined)
    .map(toPastExamQuestionView);

  const title = stageTitle(stage, field);
  const back = fromToday ? { href: "/today", label: "今日の学習" } : { href: "/past-exams", label: "公式過去問" };

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={back}
        title={title}
        description="IPA公開問題を使った演習です。解き終えると、間違えた問題のテーマが復習に入ります。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
        {ids.length > 0 ? (
          <OfficialDrillRunner
            key={questions.map((q) => q.id).join(",")}
            stage={stage}
            title={title}
            questions={questions}
            todayTaskId={todayTaskId}
          />
        ) : (
          <OfficialDrillPicker
            stage={stage}
            field={field}
            count={count}
            index={buildIndex()}
            query={Object.fromEntries(
              Object.entries({
                stage,
                field,
                count: String(count),
                from: first(params.from),
                task: first(params.task),
              }).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
            )}
          />
        )}

        <p className="text-xs leading-relaxed text-gray-500">
          問題文・選択肢・正答はIPAが公開している原文のままです。解説は本サービスが
          独自に作成したもので、IPAの公式解説ではありません。
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
