import {
  kakomonYearLabel,
  type KakomonQuestion,
} from "@/lib/publicPages/kakomon";

// 公開過去問へのリンク一覧（年度ページ・関連問題・英略語ページで共用）。

export default function KakomonList({
  questions,
  withYear = false,
}: {
  questions: KakomonQuestion[];
  withYear?: boolean;
}) {
  return (
    <ul className="k-list">
      {questions.map((q) => (
        <li key={q.view.id}>
          <a href={q.path}>
            <span className="n">
              {withYear ? `${kakomonYearLabel(q.view.year)} ` : ""}問{q.view.questionNumber}
            </span>
            <span className="t">{q.topicLabel}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
