import Link from "next/link";
import { QuestionRunner } from "@/components/study/QuestionRunner";
import { getQuestionsByTopic, questions } from "@/data/questions";
import { getTopicById } from "@/data/topics";
import { WEB_USER_ID } from "@/lib/session";

type PageProps = {
  searchParams: Promise<{
    topic?: string;
  }>;
};

export default async function PracticePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const topicId = params.topic;
  const selectedQuestions = topicId ? getQuestionsByTopic(topicId) : questions.slice(0, 5);
  const topic = topicId ? getTopicById(topicId) : undefined;

  return (
    <main className="page page-narrow">
      <p className="eyebrow">問題演習</p>
      <h1>{topic?.title ?? "確認問題"}</h1>
      <p className="lead">4択に答えると、その場で解説を表示します。間違えたテーマは復習対象になります。</p>
      {topicId && !topic ? (
        <div className="card card-pad">
          <p>テーマが見つかりません。</p>
          <Link className="button button-secondary" href="/today">
            今日の学習へ
          </Link>
        </div>
      ) : (
        <QuestionRunner questions={selectedQuestions} topicTitle={topic?.title ?? "総合演習"} userId={WEB_USER_ID} />
      )}
    </main>
  );
}
