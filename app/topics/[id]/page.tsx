import Link from "next/link";
import { notFound } from "next/navigation";
import type { Topic } from "@/types/content";
import { FIELD_LABELS, IMPORTANCE_LABELS } from "@/types/content";
import { getAllTopics, getTopic } from "@/lib/content";
import { getMiniGameForTopic } from "@/lib/minigames";
import DiagramRenderer from "@/components/diagrams/DiagramRenderer";
import CheckQuestionCard from "@/components/learn/CheckQuestionCard";
import AddToReviewButton from "@/components/learn/AddToReviewButton";
import VisualLearningSection from "@/components/visual-learning/VisualLearningSection";
import ProcessDemoSection from "@/components/learn/ProcessDemoSection";
import BottomNav from "@/components/BottomNav";

// トピック詳細。理解カード → 確認問題 → 解説 → 復習 → 参考書キーワード → 過去問分野 の順。
// 既存トピックはビルド時に静的生成する。
export function generateStaticParams() {
  return getAllTopics().map((t) => ({ id: t.id }));
}

const DIFFICULTY_LABEL: Record<Topic["difficulty"], string> = {
  1: "やさしい",
  2: "ふつう",
  3: "ややむずかしい",
};

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = getTopic(id);
  if (!topic) notFound();

  const miniGame = getMiniGameForTopic(topic.miniGameId);
  // 難テーマ（DNS / SQL / 認証・認可）は、操作できる理解パートを
  // トピック内に直接埋め込み、別ページ（/minigames）への遷移を主導線にしない。
  const processDemo = topic.processDemo;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-6 pt-5 text-white">
        <div className="mx-auto w-full max-w-md">
          <Link href="/topics" className="text-sm font-medium text-white/80">
            ← トピック一覧
          </Link>
          <p className="mt-2 text-xs font-semibold text-white/80">
            {FIELD_LABELS[topic.field]}・{topic.category}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">{topic.title}</h1>
          <p className="mt-2 text-sm text-white/90">{topic.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">
              ⏱️ 目安 {topic.estimatedMinutes}分
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">
              重要度：{IMPORTANCE_LABELS[topic.importance]}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">
              難易度：{DIFFICULTY_LABEL[topic.difficulty]}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-7">
        {/* 難テーマ: 操作できる理解パートをページ内で完結（別ページ遷移なし） */}
        {processDemo && <ProcessDemoSection demo={processDemo} />}

        {/* 通常トピック: 従来の固定構成（視覚理解→概念→図解→ミニゲーム導線） */}
        {!processDemo && (
          <>
            {/* ① 視覚理解パーツ（MVP対象トピックのみ） */}
            <VisualLearningSection visualLearning={topic.visualLearning} />

            {/* ② 概念カード（図解理解） */}
            <Section emoji="💡" title="まずはイメージをつかむ">
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
        </Section>

        {/* ②.7 ミニゲームで理解する（miniGameId が設定されたトピックのみ） */}
        {miniGame && (
          <Section emoji="🎮" title="操作して理解する">
            <Link
              href={`/minigames/${miniGame.id}`}
              className="block rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 transition active:scale-[0.99]"
            >
              <p className="text-base font-extrabold text-gray-800">
                {miniGame.title}
              </p>
              <p className="mt-1 text-sm leading-snug text-gray-600">
                {miniGame.description}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  ⏱️ 約{miniGame.estimatedMinutes}分
                </span>
                <span className="rounded-full bg-indigo-600 px-3.5 py-1.5 text-sm font-bold text-white">
                  ▶ 遊んでみる
                </span>
              </div>
            </Link>
          </Section>
        )}
          </>
        )}

        {/* ③ 確認問題 */}
        <Section emoji="✏️" title="確認問題">
          <ul className="space-y-4">
            {topic.checkQuestions.map((q, i) => (
              <li key={q.id}>
                <CheckQuestionCard q={q} number={i + 1} />
              </li>
            ))}
          </ul>
        </Section>

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
                {f.note && (
                  <p className="mt-0.5 text-xs text-gray-500">{f.note}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <BottomNav />
    </main>
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
