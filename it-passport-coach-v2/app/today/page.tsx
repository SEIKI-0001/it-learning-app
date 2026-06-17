import Link from "next/link";
import { ArrowRight, BookMarked, CheckCircle2, Clock, PenLine, RotateCcw } from "lucide-react";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StudySessionMarker } from "@/components/study/StudySessionMarker";
import { domainLabels } from "@/data/topics";
import { WEB_USER_ID } from "@/lib/session";
import { getRepository } from "@/lib/storage";
import { buildTodayRecommendation } from "@/lib/study-planner";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const repository = getRepository();
  const profile = await repository.getUserProfile(WEB_USER_ID);

  if (!profile) {
    return (
      <main className="page page-narrow">
        <p className="eyebrow">今日の学習</p>
        <h1>先に初回設定をしてください</h1>
        <p className="lead">試験日と使える時間が分かると、今日やるテーマと復習量を決められます。</p>
        <Link className="button button-primary" href="/onboarding">
          初回設定へ
        </Link>
      </main>
    );
  }

  const recommendation = await buildTodayRecommendation(repository, profile);

  return (
    <main className="page">
      <StudySessionMarker topicId={recommendation.topic.id} userId={WEB_USER_ID} />
      <section className="card card-pad study-panel">
        <div className="topic-meta">
          <span className="pill">{domainLabels[recommendation.topic.domain]}</span>
          <span className="pill pill-blue">
            <Clock size={15} aria-hidden /> {recommendation.estimatedMinutes}分
          </span>
        </div>
        <h1 style={{ fontSize: "3rem", lineHeight: 1.05 }}>{recommendation.topic.title}</h1>
        <p className="lead">{recommendation.reason}</p>
        <div className="button-row">
          <Link className="button button-primary" href={`/topics/${recommendation.topic.id}`}>
            <BookMarked size={18} aria-hidden />
            テーマ学習
          </Link>
          <Link className="button button-secondary" href={`/practice?topic=${recommendation.topic.id}`}>
            <PenLine size={18} aria-hidden />
            確認問題
          </Link>
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="card card-pad">
          <h2>参考書で読む範囲</h2>
          <p className="learning-copy">{recommendation.bookRange}</p>
        </div>
        <div className="card card-pad">
          <h2>次にやること</h2>
          <p className="learning-copy">{recommendation.nextAction}</p>
        </div>
      </section>

      <section className="section">
        <SectionHeader title="初学者向けの説明" description="まず言葉の意味を掴みます。" />
        <div className="card card-pad">
          <p className="learning-copy">{recommendation.beginnerExplanation}</p>
          <p className="learning-copy">たとえ話: {recommendation.topic.analogy}</p>
        </div>
      </section>

      <section className="section">
        <SectionHeader title="図解で見るなら" description="ノートにこの矢印を描くと理解しやすいです。" />
        <div className="card card-pad">
          <p className="learning-copy">{recommendation.diagramText}</p>
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="card card-pad">
          <h2>
            <CheckCircle2 size={20} aria-hidden /> 確認問題
          </h2>
          <p className="learning-copy">
            {recommendation.questions.length}問だけ解きます。間違えたテーマは自動で復習対象になります。
          </p>
          <Link className="button button-primary" href={`/practice?topic=${recommendation.topic.id}`}>
            問題へ <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        <div className="card card-pad">
          <h2>
            <RotateCcw size={20} aria-hidden /> 復習対象
          </h2>
          {recommendation.reviewTopics.length > 0 ? (
            <ul className="trap-list">
              {recommendation.reviewTopics.map((topic) => (
                <li key={topic.id}>{topic.title}</li>
              ))}
            </ul>
          ) : (
            <p className="learning-copy">今日すぐ戻す復習は少なめです。まず新しいテーマを進めましょう。</p>
          )}
          <Link className="button button-secondary" href="/review">
            復習ページへ
          </Link>
        </div>
      </section>
    </main>
  );
}
