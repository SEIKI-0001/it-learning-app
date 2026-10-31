"use client";

import { createElement, useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { cardClass } from "@/components/ui/Card";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import { getUserId, todayLocalDate } from "@/lib/userSession";
import { EXPLAIN3D_LIMITS, type ExplainRequest, type ExplainResponse, type ExplainResult } from "@/lib/explain3d/types";
import ExplainPlayer from "./ExplainPlayer";
import { EXISTING_MODEL_VIEWS } from "./existingModels";

// 「〜の仕組みを解説して」と入力すると、3D模型で解説する（β）。
// 作り込んだ模型があるテーマはその解説を開き、無ければ AI が決まった部品で組んだ場面を再生する。

const EXAMPLES = ["DNSの仕組み", "VPNの仕組み", "メールが届く仕組み", "シングルサインオンの仕組み", "QRコード決済の仕組み"];

const DEFAULT_ERROR = "今は模型を組み立てられませんでした。少し時間をおいて、もう一度試してください。";

type State =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "done"; question: string; result: ExplainResult }
  | { status: "error"; question: string; reason: string; error: string };

async function requestExplain(question: string): Promise<ExplainResponse> {
  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        userId: getUserId(),
        localDate: todayLocalDate(),
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      } satisfies ExplainRequest),
    });
    const data = (await res.json().catch(() => null)) as ExplainResponse | null;
    if (!data) return { ok: false, reason: "failed", error: DEFAULT_ERROR };
    return data;
  } catch {
    return { ok: false, reason: "failed", error: DEFAULT_ERROR };
  }
}

/** 模型（ジオラマ・3D）のある場所。解説の1枚目が文字や表のテーマもあるので、模型のあるスライドから見せる */
const MODEL_SELECTOR = "[data-diorama-stage], [data-scene3d-loading], canvas";
const SLIDE_SELECTOR = "[data-experience-slide-id]";

/** 読み込まれた解説の中で、模型が最初に出るスライドへ一度だけ送る */
function useOpenModelSlide(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let done = false;
    const tryOpen = () => {
      if (done) return;
      const panel = root.querySelector(MODEL_SELECTOR)?.closest(SLIDE_SELECTOR);
      if (!panel) return;
      done = true;
      const index = [...root.querySelectorAll(SLIDE_SELECTOR)].indexOf(panel);
      if (index > 0) root.querySelector<HTMLButtonElement>(`button[aria-label="解説${index + 1}"]`)?.click();
    };
    const observer = new MutationObserver(tryOpen);
    observer.observe(root, { childList: true, subtree: true });
    tryOpen();
    // 読み込みが遅くても、学習者が自分でスライドを動かしたあとに勝手に送らない
    const stop = window.setTimeout(() => {
      done = true;
      observer.disconnect();
    }, 6000);
    return () => {
      observer.disconnect();
      window.clearTimeout(stop);
    };
  }, [ref]);
}

function ExistingResult({ result }: { result: Extract<ExplainResult, { kind: "existing" }> }) {
  const View = EXISTING_MODEL_VIEWS[result.topicId];
  const ref = useRef<HTMLElement>(null);
  useOpenModelSlide(ref);
  return (
    <section ref={ref} className={cardClass("p-4")} data-testid="explain-existing" data-topic={result.topicId}>
      <p className="text-[11px] font-bold text-brand-700">作り込んだ模型で解説します</p>
      <h2 className="mt-0.5 text-base font-bold text-gray-900">{result.topicTitle}</h2>
      {result.reason && <p className="mt-1 text-sm leading-relaxed text-gray-600">{result.reason}</p>}
      <div className="mt-3">{View ? <ExperienceSlideDeck>{createElement(View)}</ExperienceSlideDeck> : null}</div>
      <Link href={result.lessonHref} className={buttonClass("secondary", "sm", "mt-4")}>
        このテーマのレッスンへ
      </Link>
    </section>
  );
}

function GeneratedResult({ result }: { result: Extract<ExplainResult, { kind: "generated" }> }) {
  const { scene } = result;
  return (
    <section className={cardClass("p-4")} data-testid="explain-generated-result">
      <p className="text-[11px] font-bold text-brand-700">AIが部品を組んで作った模型</p>
      <h2 className="mt-0.5 text-base font-bold text-gray-900">{scene.title}</h2>
      {scene.summary && <p className="mt-1 text-sm leading-relaxed text-gray-600">{scene.summary}</p>}
      <div className="mt-3">
        <ExplainPlayer scene={scene} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        この模型は質問に合わせてAIがその場で組み立てたものです。用語や細かい点は、レッスンの解説で確かめてください。
      </p>
      {result.relatedLessonHref && result.relatedTopicTitle && (
        <Link href={result.relatedLessonHref} className={buttonClass("secondary", "sm", "mt-3")}>
          近いテーマ「{result.relatedTopicTitle}」のレッスンへ
        </Link>
      )}
    </section>
  );
}

export default function ExplainClient() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const loading = state.status === "loading";

  async function ask(question: string) {
    const q = question.trim();
    if (q.length < 2 || loading) return;
    setState({ status: "loading", question: q });
    const res = await requestExplain(q);
    setState(res.ok ? { status: "done", question: q, result: res.result } : { status: "error", question: q, reason: res.reason, error: res.error });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        title="3D模型で解説（β）"
        description="知りたい仕組みを入力すると、模型を動かしながら解説します。"
        back={{ href: "/more", label: "その他" }}
      />

      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 pt-4 md:px-4">
        <form onSubmit={onSubmit} className={cardClass("p-4")}>
          <label htmlFor="explain-question" className="text-sm font-bold text-gray-900">
            どの仕組みを見たいですか？
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="explain-question"
              data-testid="explain-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={EXPLAIN3D_LIMITS.questionMaxLength}
              placeholder="例：DNSの仕組みを解説して"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none"
            />
            <button type="submit" className={buttonClass("primary", "md", "shrink-0")} disabled={loading || input.trim().length < 2}>
              {loading ? "組み立て中…" : "解説して"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="入力の例">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={loading}
                onClick={() => {
                  setInput(ex);
                  void ask(ex);
                }}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>

        {state.status === "loading" && (
          <div className={cardClass("grid place-items-center p-8 text-sm font-bold text-gray-500")} role="status">
            「{state.question}」の模型を組み立てています…
          </div>
        )}

        {state.status === "error" && (
          <div className={cardClass("p-4")} role="alert" data-testid="explain-error" data-reason={state.reason}>
            <p className="text-sm text-gray-700">{state.error}</p>
            {state.reason === "login_required" ? (
              <Link href="/login" className={buttonClass("primary", "sm", "mt-3")}>
                ログインする
              </Link>
            ) : state.reason === "failed" ? (
              <button type="button" onClick={() => void ask(state.question)} className={buttonClass("secondary", "sm", "mt-3")}>
                もう一度試す
              </button>
            ) : null}
          </div>
        )}

        {state.status === "done" &&
          (state.result.kind === "existing" ? (
            <ExistingResult key={state.question} result={state.result} />
          ) : (
            <GeneratedResult key={state.question} result={state.result} />
          ))}
      </div>
      <BottomNav />
    </main>
  );
}
