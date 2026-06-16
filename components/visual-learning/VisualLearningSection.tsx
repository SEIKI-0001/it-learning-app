"use client";

import { useState } from "react";
import DiagramRenderer from "@/components/diagrams/DiagramRenderer";
import type {
  AnimationSpec,
  ClassificationMiniGame,
  IllustrationSpec,
  InteractiveSpec,
  MatchingMiniGame,
  MiniGameSpec,
  VisualLearningSpec,
} from "@/types/content";

export default function VisualLearningSection({
  visualLearning,
}: {
  visualLearning?: VisualLearningSpec;
}) {
  if (!visualLearning) return null;

  return (
    <section className="-mx-4 bg-white px-4 py-5 ring-1 ring-gray-200 sm:mx-0">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
        <span aria-hidden>▣</span>
        {visualLearning.title ?? "まず図で理解する"}
      </h2>
      {visualLearning.lead && (
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {visualLearning.lead}
        </p>
      )}

      <div className="mt-5 space-y-5">
        {visualLearning.diagram && (
          <div>
            <DiagramRenderer spec={visualLearning.diagram} />
          </div>
        )}
        {visualLearning.illustration && (
          <IllustrationView spec={visualLearning.illustration} />
        )}
        {visualLearning.interactive && (
          <TapRevealView spec={visualLearning.interactive} />
        )}
        {visualLearning.animation && (
          <StepFlowView spec={visualLearning.animation} />
        )}
        {visualLearning.miniGame && (
          <MiniGameView spec={visualLearning.miniGame} />
        )}
      </div>
    </section>
  );
}

function PartTitle({ title, prompt }: { title: string; prompt?: string }) {
  return (
    <div>
      <h3 className="text-base font-extrabold text-gray-800">{title}</h3>
      {prompt && (
        <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">
          {prompt}
        </p>
      )}
    </div>
  );
}

function IllustrationView({ spec }: { spec: IllustrationSpec }) {
  return (
    <div className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
      <PartTitle title={spec.title} prompt={spec.caption} />
      <ul className="mt-3 grid grid-cols-1 gap-2.5">
        {spec.items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl bg-sky-50 px-3 py-3 ring-1 ring-sky-100"
          >
            {item.emoji && (
              <span className="text-2xl leading-none" aria-hidden>
                {item.emoji}
              </span>
            )}
            <div>
              <p className="text-sm font-extrabold text-sky-950">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-sky-900/75">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TapRevealView({ spec }: { spec: InteractiveSpec }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = spec.items[selectedIndex];

  return (
    <div className="border-t border-gray-100 pt-4">
      <PartTitle title={spec.title} prompt={spec.prompt} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {spec.items.map((item, i) => {
          const active = i === selectedIndex;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={
                active
                  ? "min-h-14 rounded-xl bg-indigo-600 px-2 py-2 text-left text-sm font-extrabold text-white shadow-sm"
                  : "min-h-14 rounded-xl bg-gray-50 px-2 py-2 text-left text-sm font-bold text-gray-700 ring-1 ring-gray-200"
              }
            >
              {item.emoji && (
                <span className="mr-1.5" aria-hidden>
                  {item.emoji}
                </span>
              )}
              {item.label}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-3 ring-1 ring-indigo-100">
          <p className="text-sm font-extrabold text-indigo-950">
            {selected.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-indigo-900/75">
            {selected.body}
          </p>
        </div>
      )}
    </div>
  );
}

function StepFlowView({ spec }: { spec: AnimationSpec }) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <PartTitle title={spec.title} prompt={spec.caption} />
      <ol className="mt-3 space-y-2">
        {spec.steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <div
              className="mt-1 h-3 w-3 shrink-0 rounded-full bg-emerald-400 motion-safe:animate-pulse"
              style={{ animationDelay: `${i * 180}ms` }}
              aria-hidden
            />
            <div className="flex-1 rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-100">
              <p className="text-sm font-extrabold text-emerald-950">
                {step.emoji && (
                  <span className="mr-1" aria-hidden>
                    {step.emoji}
                  </span>
                )}
                {step.label}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-emerald-900/75">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MiniGameView({ spec }: { spec: MiniGameSpec }) {
  if (spec.type === "classification") {
    return <ClassificationGame spec={spec} />;
  }
  return <MatchingGame spec={spec} />;
}

function ClassificationGame({ spec }: { spec: ClassificationMiniGame }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const correctCount = spec.cards.filter(
    (card, i) => answers[i] === card.belongsTo,
  ).length;

  return (
    <div className="border-t border-gray-100 pt-4">
      <PartTitle title={spec.title} prompt={spec.prompt} />
      <div className="mt-3 flex flex-wrap gap-2">
        {spec.buckets.map((bucket) => (
          <span
            key={bucket.id}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700"
          >
            {bucket.label}
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-3">
        {spec.cards.map((card, i) => {
          const selected = answers[i];
          const correct = selected === card.belongsTo;
          const selectedBucket = spec.buckets.find(
            (bucket) => bucket.id === selected,
          );

          return (
            <li key={card.label} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-extrabold text-gray-800">
                {card.label}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {spec.buckets.map((bucket) => (
                  <button
                    key={bucket.id}
                    type="button"
                    onClick={() =>
                      setAnswers((current) => ({ ...current, [i]: bucket.id }))
                    }
                    className={
                      selected === bucket.id
                        ? "rounded-lg bg-gray-900 px-2 py-2 text-xs font-extrabold text-white"
                        : "rounded-lg bg-white px-2 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-200"
                    }
                  >
                    {bucket.label}
                  </button>
                ))}
              </div>
              {selected && (
                <p
                  className={
                    correct
                      ? "mt-2 text-xs font-semibold leading-relaxed text-emerald-700"
                      : "mt-2 text-xs font-semibold leading-relaxed text-rose-700"
                  }
                >
                  {correct ? "正解" : `${selectedBucket?.label ?? "選択"}ではなく別の分類`}。
                  {card.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
        {correctCount}/{spec.cards.length} 件クリア
      </p>
    </div>
  );
}

function MatchingGame({ spec }: { spec: MatchingMiniGame }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const rights = [...spec.pairs.map((pair) => pair.right)].sort((a, b) =>
    a.localeCompare(b, "ja"),
  );
  const correctCount = spec.pairs.filter(
    (pair, i) => answers[i] === pair.right,
  ).length;

  return (
    <div className="border-t border-gray-100 pt-4">
      <PartTitle title={spec.title} prompt={spec.prompt} />
      <ul className="mt-3 space-y-3">
        {spec.pairs.map((pair, i) => {
          const selected = answers[i];
          const correct = selected === pair.right;

          return (
            <li key={pair.left} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-extrabold text-gray-800">
                {pair.left}
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {rights.map((right) => (
                  <button
                    key={right}
                    type="button"
                    onClick={() =>
                      setAnswers((current) => ({ ...current, [i]: right }))
                    }
                    className={
                      selected === right
                        ? "rounded-lg bg-gray-900 px-2 py-2 text-left text-xs font-extrabold text-white"
                        : "rounded-lg bg-white px-2 py-2 text-left text-xs font-bold text-gray-700 ring-1 ring-gray-200"
                    }
                  >
                    {right}
                  </button>
                ))}
              </div>
              {selected && (
                <p
                  className={
                    correct
                      ? "mt-2 text-xs font-semibold leading-relaxed text-emerald-700"
                      : "mt-2 text-xs font-semibold leading-relaxed text-rose-700"
                  }
                >
                  {correct ? "正解" : "もう一度合わせてみよう"}。
                  {pair.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
        {correctCount}/{spec.pairs.length} 組クリア
      </p>
    </div>
  );
}
