import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { StatusPill } from "@/components/progress/StatusPill";
import { domainLabels, getTopicById, topics } from "@/data/topics";
import { getProgressSummary } from "@/lib/progress";
import { WEB_USER_ID } from "@/lib/session";
import { getRepository } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const repository = getRepository();
  const profile = await repository.getUserProfile(WEB_USER_ID);
  const progress = await getProgressSummary(repository, profile, WEB_USER_ID);

  return (
    <main className="page">
      <p className="eyebrow">進捗</p>
      <h1>次に何をすべきかを見る</h1>
      <p className="lead">完了数だけではなく、分野別の進み具合、テーマ別正答率、苦手テーマ、復習待ちをまとめます。</p>

      <section className="section grid grid-3">
        <div className="card card-pad stat">
          <span className="muted">全体進捗</span>
          <strong>
            {progress.completedTopics}/{progress.totalTopics}
          </strong>
          <ProgressBar value={progress.completionRate} />
        </div>
        <div className="card card-pad stat">
          <span className="muted">試験日まで</span>
          <strong>{progress.daysUntilExam ?? "-"}日</strong>
          <StatusPill status={progress.status} />
        </div>
        <div className="card card-pad stat">
          <span className="muted">次のおすすめ</span>
          <strong style={{ fontSize: "1.15rem" }}>{progress.nextRecommendedTopic?.title ?? "初回設定"}</strong>
          <Link className="button button-primary" href={progress.nextRecommendedTopic ? "/today" : "/onboarding"}>
            進める <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      <section className="section">
        <SectionHeader title="分野別の進捗" />
        <div className="grid grid-3">
          {progress.domainProgress.map((domain) => (
            <div className="card card-pad" key={domain.domain}>
              <h2>{domainLabels[domain.domain]}</h2>
              <p className="muted">
                {domain.completedTopics}/{domain.totalTopics}テーマ
              </p>
              <ProgressBar value={domain.completionRate} />
              <p className="muted" style={{ marginTop: 10 }}>
                正答率: {domain.accuracy === null ? "-" : `${Math.round(domain.accuracy * 100)}%`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="section grid grid-2">
        <div>
          <SectionHeader title="苦手テーマ" />
          <div className="grid">
            {progress.weakTopics.length > 0 ? (
              progress.weakTopics.map((topic) => (
                <Link className="card card-pad" href={`/topics/${topic.id}`} key={topic.id}>
                  <span className="pill pill-danger">{domainLabels[topic.domain]}</span>
                  <h3 style={{ marginTop: 10 }}>{topic.title}</h3>
                  <p className="muted">{topic.summary}</p>
                </Link>
              ))
            ) : (
              <div className="card card-pad">
                <p className="muted">まだ苦手判定はありません。確認問題を解くと自動で見えてきます。</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionHeader title="テーマ別正答率" />
          <div className="grid">
            {progress.topicAccuracies
              .filter((accuracy) => accuracy.attempts > 0)
              .map((accuracy) => {
                const topic = getTopicById(accuracy.topicId);
                if (!topic) return null;
                return (
                  <div className="card card-pad" key={accuracy.topicId}>
                    <h3>{topic.title}</h3>
                    <p className="muted">
                      {accuracy.correct}/{accuracy.attempts}問正解
                    </p>
                    <ProgressBar value={accuracy.accuracy ?? 0} />
                  </div>
                );
              })}
            {progress.topicAccuracies.every((accuracy) => accuracy.attempts === 0) ? (
              <div className="card card-pad">
                <p className="muted">問題に回答すると、テーマ別の正答率が表示されます。</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeader title="全テーマ一覧" description="あとからコンテンツを足しても、この一覧に反映されます。" />
        <div className="grid grid-3">
          {topics.map((topic) => (
            <Link className="card card-pad" href={`/topics/${topic.id}`} key={topic.id}>
              <span className="pill">{domainLabels[topic.domain]}</span>
              <h3 style={{ marginTop: 10 }}>{topic.title}</h3>
              <p className="muted">{topic.recommendedMinutes}分</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
