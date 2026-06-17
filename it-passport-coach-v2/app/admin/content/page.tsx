import { questions } from "@/data/questions";
import { domainLabels, topics } from "@/data/topics";

export default function AdminContentPage() {
  return (
    <main className="page">
      <p className="eyebrow">Admin</p>
      <h1>コンテンツ一覧</h1>
      <p className="lead">TypeScriptデータとして管理しているテーマと問題です。将来的にDBへ移しても同じ構造で扱えます。</p>

      <section className="section">
        <h2>テーマ一覧</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>分野</th>
              <th>テーマ</th>
              <th>推奨時間</th>
              <th>復習優先度</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.id}>
                <td>{topic.id}</td>
                <td>{domainLabels[topic.domain]}</td>
                <td>{topic.title}</td>
                <td>{topic.recommendedMinutes}分</td>
                <td>{topic.reviewPriority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>問題一覧</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>テーマID</th>
              <th>問題</th>
              <th>正解</th>
              <th>難易度</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.id}>
                <td>{question.id}</td>
                <td>{question.topicId}</td>
                <td>{question.prompt}</td>
                <td>{question.correctChoiceId.toUpperCase()}</td>
                <td>{question.difficulty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
