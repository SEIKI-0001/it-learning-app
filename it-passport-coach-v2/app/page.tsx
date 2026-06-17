import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, Gamepad2, LineChart, MessageCircle, RotateCcw } from "lucide-react";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { StatusPill } from "@/components/progress/StatusPill";
import { domainLabels } from "@/data/topics";
import { getProgressSummary } from "@/lib/progress";
import { WEB_USER_ID } from "@/lib/session";
import { getRepository } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const repository = getRepository();
  const profile = await repository.getUserProfile(WEB_USER_ID);
  const progress = await getProgressSummary(repository, profile, WEB_USER_ID);

  return (
    <main className="page">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">LINEで伴走するITパスポート合格支援</p>
          <h1>IT Passport Coach ver.2</h1>
          <p className="lead">
            試験日、使える時間、苦手分野、回答履歴から、今日やることを毎日生成します。
            参考書、図解理解、確認問題、復習をひとつの流れにして、初学者が迷わず続けられる状態を作ります。
          </p>
          <div className="button-row">
            <Link className="button button-primary" href={profile ? "/today" : "/onboarding"}>
              <BookOpenCheck size={18} aria-hidden />
              {profile ? "今日の学習へ" : "初回設定をする"}
            </Link>
            <Link className="button button-secondary" href="/progress">
              <LineChart size={18} aria-hidden />
              進捗を見る
            </Link>
          </div>
        </div>

        <div className="card dashboard-visual">
          <div className="study-map">
            <div className="study-node">
              <span className="node-icon">
                <CalendarDays size={21} aria-hidden />
              </span>
              <div>
                <strong>試験日から逆算</strong>
                <span>{progress.daysUntilExam === null ? "設定後に残り日数を表示" : `残り${progress.daysUntilExam}日`}</span>
              </div>
            </div>
            <div className="study-node">
              <span className="node-icon">
                <BookOpenCheck size={21} aria-hidden />
              </span>
              <div>
                <strong>今日のテーマ</strong>
                <span>{progress.nextRecommendedTopic?.title ?? "初回設定後に提案"}</span>
              </div>
            </div>
            <div className="study-node">
              <span className="node-icon">
                <RotateCcw size={21} aria-hidden />
              </span>
              <div>
                <strong>復習待ち</strong>
                <span>{progress.pendingReviewTopics.length}テーマ</span>
              </div>
            </div>
            <div className="study-node">
              <span className="node-icon">
                <MessageCircle size={21} aria-hidden />
              </span>
              <div>
                <strong>LINEコマンド</strong>
                <span>はじめる / 今日 / 復習 / 進捗 / ヘルプ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeader title="現在の学習状態" description="固定スケジュールではなく、テーマと回答履歴をもとに判断します。" />
        <div className="grid grid-3">
          <div className="card card-pad stat">
            <span className="muted">完了テーマ</span>
            <strong>
              {progress.completedTopics}/{progress.totalTopics}
            </strong>
            <ProgressBar value={progress.completionRate} />
          </div>
          <div className="card card-pad stat">
            <span className="muted">状態</span>
            <strong>
              <StatusPill status={progress.status} />
            </strong>
            <span className="muted">次の行動が分かることを優先します。</span>
          </div>
          <div className="card card-pad stat">
            <span className="muted">次にやること</span>
            <strong style={{ fontSize: "1.15rem" }}>{progress.nextRecommendedTopic?.title ?? "初回設定"}</strong>
            <Link className="button button-secondary" href={profile ? "/today" : "/onboarding"}>
              進める <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeader title="分野別" description="ストラテジ・マネジメント・テクノロジをテーマ単位で積み上げます。" />
        <div className="grid grid-3">
          {progress.domainProgress.map((domain) => (
            <div className="card card-pad" key={domain.domain}>
              <h3>{domainLabels[domain.domain]}</h3>
              <p className="muted">
                {domain.completedTopics}/{domain.totalTopics}テーマ完了
              </p>
              <ProgressBar value={domain.completionRate} />
              <p className="muted" style={{ marginTop: 10 }}>
                正答率: {domain.accuracy === null ? "-" : `${Math.round(domain.accuracy * 100)}%`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader title="体験で理解" description="言葉だけでつまずきやすいテーマは小さなWeb体験にします。" />
        <Link className="button button-accent" href="/minigame">
          <Gamepad2 size={18} aria-hidden />
          DNSミニゲームへ
        </Link>
      </section>
    </main>
  );
}
