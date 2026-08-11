import LearnHome from "@/components/learn/LearnHome";
import { getThemeExamSummaries } from "@/lib/themeExam";

export default function LearnPage() {
  // 問題の実体はサーバに置いたまま、件数と合格ラインだけを渡す。
  return <LearnHome themeExams={getThemeExamSummaries()} />;
}
