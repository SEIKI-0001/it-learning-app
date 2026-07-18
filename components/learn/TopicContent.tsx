import { createElement } from "react";
import type { Topic } from "@/types/content";
import DiagramRenderer from "@/components/diagrams/DiagramRenderer";
import CheckQuestionCard from "@/components/learn/CheckQuestionCard";
import ExplanationSlides, {
  type ExplanationSlide,
} from "@/components/learn/ExplanationSlides";
import AddToReviewButton from "@/components/learn/AddToReviewButton";
import VisualLearningSection from "@/components/visual-learning/VisualLearningSection";
import ProcessDemoSection from "@/components/learn/ProcessDemoSection";
import { getTopicExperience } from "@/components/experiences/registry";

export function buildExplanationSlides(topic: Topic): ExplanationSlide[] {
  const processDemo = topic.processDemo;
  // テーマ専用に作り込んだ「体験コンポーネント」があれば、汎用カード図解の
  // 代わりにそれを描画する（テーマごとに見せ方を最適化するための仕組み）。
  // レジストリから取り出した既存コンポーネントなので createElement で描画する
  // （render 中に新規コンポーネントを定義しているわけではない）。
  const experience = getTopicExperience(topic.id);
  const explanationKeyPoints = topic.explanation.keyPoints ?? [];
  const explanationSlides: ExplanationSlide[] = [];

  if (experience) {
    explanationSlides.push({
      id: "experience",
      label: "体験して理解",
      content: createElement(experience),
    });
  } else if (processDemo) {
    explanationSlides.push({
      id: "process-demo",
      label: "体験して理解",
      content: <ProcessDemoSection demo={processDemo} />,
    });
  } else if (topic.visualLearning) {
    explanationSlides.push({
      id: "visual-learning",
      label: "図で理解する",
      content: <VisualLearningSection visualLearning={topic.visualLearning} />,
    });
  }

  explanationSlides.push({
    id: "concept",
    label: "イメージをつかむ",
    content: (
      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <h3 className="text-base font-bold text-gray-800">
          {topic.conceptCard.heading}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {topic.conceptCard.body}
        </p>
        {topic.conceptCard.analogy && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-800">
            🪄 たとえると…&nbsp;{topic.conceptCard.analogy}
          </p>
        )}
        {topic.conceptCard.diagram && (
          <div className="mt-4">
            <DiagramRenderer spec={topic.conceptCard.diagram} />
          </div>
        )}
      </section>
    ),
  });

  explanationSlides.push({
    id: "exam-points",
    label: "試験ポイント",
    content: (
      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <h3 className="text-base font-bold text-gray-800">試験ポイント</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {topic.explanation.body}
        </p>
        {explanationKeyPoints.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {explanationKeyPoints.map((keyPoint, index) => (
              <li
                key={index}
                className="flex gap-2 text-sm font-semibold text-gray-700"
              >
                <span aria-hidden className="text-indigo-500">
                  ✓
                </span>
                {keyPoint}
              </li>
            ))}
          </ul>
        )}
        {topic.explanation.diagram && (
          <div className="mt-4">
            <DiagramRenderer spec={topic.explanation.diagram} />
          </div>
        )}
      </section>
    ),
  });

  return explanationSlides;
}

// トピックの本文スタック（理解パート→[確認問題]→解説→復習→参考書→過去問分野）。
// トピック詳細ページと「今日の学習メニュー」で同一の内容を表示するため共有する。
// directive を付けないことで、サーバ（トピック詳細）/クライアント（today）両方の
// ツリーから描画できる。
export default function TopicContent({
  topic,
  showCheckQuestions = true,
}: {
  topic: Topic;
  showCheckQuestions?: boolean;
}) {
  const explanationSlides = buildExplanationSlides(topic);

  return (
    <div className="space-y-8">
      {/* 導入: 用語説明の前に「なぜこの概念が必要か」を問いかけて引き込む。 */}
      {topic.hookQuestion && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-100">
          <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
            <span aria-hidden>🤔</span>
            最初に考えてみよう
          </p>
          <p className="mt-2 text-base font-bold leading-relaxed text-gray-800">
            {topic.hookQuestion}
          </p>
        </section>
      )}

      {/* 解説: 内容を1枚ずつ横に進める */}
      <ExplanationSlides title="📖 解説" slides={explanationSlides} />

      {/* ③ 確認問題（today では完了クイズを別に出すため非表示にできる） */}
      {showCheckQuestions && (
        <Section emoji="✏️" title="確認問題">
          <ul className="space-y-4">
            {topic.checkQuestions.map((q, i) => (
              <li key={q.id}>
                <CheckQuestionCard q={q} number={i + 1} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// 「解説で理解を固める・あとで思い出すための復習・参考書で探すキーワード・
// 関連する過去問分野」。today では「今日の学習を完了する」ボタンより下
// （ページ最下部）に置きたいため、本文スタック（TopicContent）から切り出して
// 独立コンポーネントにしている。トピック詳細では従来どおり本文の続き
// （確認問題のあと）に並べて表示する。
export function TopicReviewSections({ topic }: { topic: Topic }) {
  return (
    <div className="space-y-8">
      {/* ④ 図解付き解説 */}
      <Section emoji="📘" title="解説で理解を固める">
        <p className="text-sm leading-relaxed text-gray-700">
          {topic.explanation.body}
        </p>
        {topic.explanation.keyPoints &&
          topic.explanation.keyPoints.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {topic.explanation.keyPoints.map((kp, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm font-semibold text-gray-700"
                >
                  <span aria-hidden className="text-indigo-500">
                    ✓
                  </span>
                  {kp}
                </li>
              ))}
            </ul>
          )}
        {topic.explanation.diagram && (
          <div className="mt-4">
            <DiagramRenderer spec={topic.explanation.diagram} />
          </div>
        )}
      </Section>

      {/* ⑤ 復習プロンプト */}
      <Section emoji="🔁" title="あとで思い出すための復習">
        <details className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold text-gray-800">
            {topic.reviewPrompt.question}
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {topic.reviewPrompt.answer}
          </p>
        </details>
        <div className="mt-4">
          <AddToReviewButton topicId={topic.id} />
        </div>
      </Section>

      {/* ⑥ 参考書で探すキーワード（関連キーワード） */}
      <Section emoji="📚" title="参考書で探すキーワード">
        <p className="mb-3 text-xs text-gray-500">
          章番号ではなく、索引でこの言葉を引いてみてください。
        </p>
        <ul className="space-y-3">
          {topic.referenceHints.map((hint, i) => (
            <li key={i}>
              <div className="flex flex-wrap gap-1.5">
                {hint.keywords.map((kw, ki) => (
                  <span
                    key={ki}
                    className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              {hint.note && (
                <p className="mt-1.5 text-xs text-gray-600">{hint.note}</p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* ⑦ 過去問道場で解くべき分野（関連する過去問分野） */}
      <Section emoji="🎯" title="関連する過去問分野">
        <ul className="space-y-2">
          {topic.kakomonFields.map((f, i) => (
            <li
              key={i}
              className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-gray-200"
            >
              <p className="text-sm font-semibold text-gray-800">{f.label}</p>
              {f.note && <p className="mt-0.5 text-xs text-gray-500">{f.note}</p>}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/** セクションの見出し＋本体の共通ラッパ */
function Section({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-800">
        <span aria-hidden>{emoji}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
