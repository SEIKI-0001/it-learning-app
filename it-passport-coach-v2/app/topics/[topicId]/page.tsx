import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenCheck, Gamepad2, PenLine } from "lucide-react";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StudySessionMarker } from "@/components/study/StudySessionMarker";
import { domainLabels, getTopicById } from "@/data/topics";
import { WEB_USER_ID } from "@/lib/session";

type PageProps = {
  params: Promise<{
    topicId: string;
  }>;
};

export default async function TopicPage({ params }: PageProps) {
  const { topicId } = await params;
  const topic = getTopicById(topicId);
  if (!topic) notFound();

  return (
    <main className="page">
      <StudySessionMarker topicId={topic.id} userId={WEB_USER_ID} />
      <section className="card card-pad study-panel">
        <div className="topic-meta">
          <span className="pill">{domainLabels[topic.domain]}</span>
          <span className="pill pill-blue">{topic.recommendedMinutes}分</span>
        </div>
        <h1 style={{ fontSize: "3rem", lineHeight: 1.05 }}>{topic.title}</h1>
        <p className="lead">{topic.summary}</p>
        <div className="button-row">
          <Link className="button button-primary" href={`/practice?topic=${topic.id}`}>
            <PenLine size={18} aria-hidden />
            確認問題
          </Link>
          {topic.minigameId ? (
            <Link className="button button-accent" href="/minigame">
              <Gamepad2 size={18} aria-hidden />
              ミニゲーム
            </Link>
          ) : null}
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="card card-pad">
          <h2>初学者向け説明</h2>
          <p className="learning-copy">{topic.beginnerExplanation}</p>
        </div>
        <div className="card card-pad">
          <h2>たとえ話</h2>
          <p className="learning-copy">{topic.analogy}</p>
        </div>
      </section>

      <section className="section">
        <SectionHeader title="図解用メモ" description="文章を図に置き換えるための説明です。" />
        <div className="card card-pad">
          <p className="learning-copy">{topic.diagramText}</p>
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="card card-pad">
          <h2>
            <BookOpenCheck size={20} aria-hidden /> 重要語句
          </h2>
          <ul className="term-list">
            {topic.keyTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </div>
        <div className="card card-pad">
          <h2>よくあるひっかけ</h2>
          <ul className="trap-list">
            {topic.commonTraps.map((trap) => (
              <li key={trap}>{trap}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <SectionHeader title="参考書対応メモ" description="手元の参考書で探すときのキーワードです。" />
        <div className="grid grid-3">
          {Object.entries(topic.bookReferenceNotes).map(([bookId, note]) => (
            <div className="card card-pad" key={bookId}>
              <h3>{bookId}</h3>
              <p className="learning-copy">{note}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
