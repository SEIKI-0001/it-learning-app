import Link from "next/link";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { domainLabels } from "@/data/topics";
import { getAdminMetrics } from "@/lib/progress";
import { getRepository } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const metrics = await getAdminMetrics(getRepository());

  return (
    <main className="page">
      <p className="eyebrow">Admin</p>
      <h1>運用ダッシュボード</h1>
      <p className="lead">登録、学習、回答、苦手傾向を確認します。ADMIN_PASSWORD未設定時は表示されません。</p>

      <section className="section grid grid-3">
        <div className="card card-pad stat">
          <span className="muted">登録ユーザー数</span>
          <strong>{metrics.registeredUsers}</strong>
        </div>
        <div className="card card-pad stat">
          <span className="muted">試験日登録済み</span>
          <strong>{metrics.usersWithExamDate}</strong>
        </div>
        <div className="card card-pad stat">
          <span className="muted">今日学習したユーザー</span>
          <strong>{metrics.studiedTodayUsers}</strong>
        </div>
        <div className="card card-pad stat">
          <span className="muted">今日の回答数</span>
          <strong>{metrics.answeredTodayCount}</strong>
        </div>
        <div className="card card-pad stat">
          <span className="muted">コンテンツ</span>
          <strong>
            <Link className="button button-secondary" href="/admin/content">
              一覧を見る
            </Link>
          </strong>
        </div>
      </section>

      <section className="section">
        <SectionHeader title="分野別の正答率" />
        <div className="grid grid-3">
          {metrics.domainAccuracies.map((domain) => (
            <div className="card card-pad" key={domain.domain}>
              <h2>{domainLabels[domain.domain]}</h2>
              <p className="muted">{domain.attempts}回答</p>
              <ProgressBar value={domain.accuracy ?? 0} />
              <p className="muted" style={{ marginTop: 10 }}>
                {domain.accuracy === null ? "-" : `${Math.round(domain.accuracy * 100)}%`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader title="苦手テーマランキング" />
        <table className="admin-table">
          <thead>
            <tr>
              <th>テーマ</th>
              <th>分野</th>
              <th>誤答・復習シグナル</th>
              <th>正答率</th>
            </tr>
          </thead>
          <tbody>
            {metrics.weakTopicRanking.map((item) => (
              <tr key={item.topic.id}>
                <td>{item.topic.title}</td>
                <td>{domainLabels[item.topic.domain]}</td>
                <td>{item.wrongCount}</td>
                <td>{item.accuracy === null ? "-" : `${Math.round(item.accuracy * 100)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
