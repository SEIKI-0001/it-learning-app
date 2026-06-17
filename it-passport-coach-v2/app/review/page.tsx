import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { getQuestionsByTopic } from "@/data/questions";
import { getTopicById } from "@/data/topics";
import { todayISO } from "@/lib/date";
import { WEB_USER_ID } from "@/lib/session";
import { getRepository } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const reviewItems = (await getRepository().getReviewItems(WEB_USER_ID)).sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || b.priority - a.priority
  );
  const dueItems = reviewItems.filter((item) => item.dueDate <= todayISO());

  return (
    <main className="page">
      <p className="eyebrow">復習</p>
      <h1>間違えたテーマを短く戻す</h1>
      <p className="lead">間違えた問題や正答率の低いテーマを、優先度と期限で並べます。正解できると復習優先度が下がります。</p>

      <section className="section grid">
        {(dueItems.length > 0 ? dueItems : reviewItems).map((item) => {
          const topic = getTopicById(item.topicId);
          const question = getQuestionsByTopic(item.topicId)[0];
          if (!topic) return null;
          return (
            <div className="card card-pad" key={item.topicId}>
              <div className="topic-meta">
                <span className={item.dueDate <= todayISO() ? "pill pill-danger" : "pill"}>優先度 {item.priority}/10</span>
                <span className="pill pill-blue">期限 {item.dueDate}</span>
              </div>
              <h2 style={{ marginTop: 12 }}>{topic.title}</h2>
              <p className="learning-copy">{topic.summary}</p>
              <div className="button-row">
                {question ? (
                  <Link className="button button-primary" href={`/practice?topic=${topic.id}`}>
                    <RotateCcw size={18} aria-hidden />
                    復習問題へ
                  </Link>
                ) : null}
                <Link className="button button-secondary" href={`/topics/${topic.id}`}>
                  解説を見る <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {reviewItems.length === 0 ? (
        <div className="card card-pad">
          <h2>復習待ちはありません</h2>
          <p className="learning-copy">今日の確認問題で間違えたテーマが出ると、ここに自動で追加されます。</p>
          <Link className="button button-primary" href="/today">
            今日の学習へ
          </Link>
        </div>
      ) : null}
    </main>
  );
}
