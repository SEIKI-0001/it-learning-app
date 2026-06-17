"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, RotateCcw, XCircle } from "lucide-react";
import type { Question } from "@/types/content";

type Result = {
  questionId: string;
  isCorrect: boolean;
  correctChoiceId: Question["correctChoiceId"];
  explanation: string;
  trap?: string;
};

export function QuestionRunner({
  questions,
  topicTitle,
  userId
}: {
  questions: Question[];
  topicTitle: string;
  userId: string;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Question["correctChoiceId"] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const current = questions[index];
  const answeredCount = result ? index + 1 : index;

  if (!current) {
    return (
      <div className="card card-pad study-panel">
        <h2>このテーマの確認問題は準備中です</h2>
        <p className="learning-copy">コンテンツライブラリに問題を追加すると、この画面に自動で表示されます。</p>
        <Link className="button button-secondary" href="/today">
          今日の学習へ戻る
        </Link>
      </div>
    );
  }

  async function submit(choiceId: Question["correctChoiceId"]) {
    setSelected(choiceId);
    setSubmitting(true);
    const response = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        questionId: current.id,
        selectedChoiceId: choiceId
      })
    });
    if (!response.ok) {
      setSubmitting(false);
      alert("回答を保存できませんでした。時間を置いてもう一度試してください。");
      return;
    }
    const payload = (await response.json()) as Result;
    setResult(payload);
    setSubmitting(false);
  }

  function next() {
    setSelected(null);
    setResult(null);
    setIndex((currentIndex) => Math.min(currentIndex + 1, questions.length - 1));
  }

  function retry() {
    setSelected(null);
    setResult(null);
  }

  return (
    <div className="card card-pad study-panel">
      <div className="topic-meta">
        <span className="pill">{topicTitle}</span>
        <span className="pill pill-blue">
          {answeredCount}/{questions.length}問
        </span>
      </div>
      <h1 style={{ fontSize: "2rem", lineHeight: 1.2 }}>{current.prompt}</h1>
      <div className="grid">
        {current.choices.map((choice) => {
          const isCorrect = result?.correctChoiceId === choice.id;
          const isWrong = result && selected === choice.id && !result.isCorrect;
          return (
            <button
              className={`button question-choice ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
              disabled={Boolean(result) || submitting}
              key={choice.id}
              type="button"
              onClick={() => submit(choice.id)}
            >
              {result ? (
                isCorrect ? (
                  <CheckCircle2 size={18} aria-hidden />
                ) : isWrong ? (
                  <XCircle size={18} aria-hidden />
                ) : (
                  <Circle size={18} aria-hidden />
                )
              ) : (
                <Circle size={18} aria-hidden />
              )}
              <span>
                {choice.id.toUpperCase()}. {choice.text}
              </span>
            </button>
          );
        })}
      </div>

      {result ? (
        <div className="card card-pad" style={{ boxShadow: "none" }}>
          <span className={result.isCorrect ? "pill" : "pill pill-danger"}>
            {result.isCorrect ? "正解" : "復習対象に追加"}
          </span>
          <p className="learning-copy" style={{ marginTop: 12 }}>
            {result.explanation}
          </p>
          {result.trap ? <p className="learning-copy">ひっかけ: {result.trap}</p> : null}
          <div className="button-row">
            {index < questions.length - 1 ? (
              <button className="button button-primary" type="button" onClick={next}>
                次の問題へ
              </button>
            ) : (
              <Link className="button button-primary" href="/progress">
                進捗を見る
              </Link>
            )}
            {!result.isCorrect ? (
              <button className="button button-secondary" type="button" onClick={retry}>
                <RotateCcw size={17} aria-hidden />
                もう一度考える
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
