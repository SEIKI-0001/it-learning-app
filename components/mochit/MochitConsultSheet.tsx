"use client";

// モチット相談シート（常駐モチットの AI 相談）。
//
// 入口は常駐モチットのタップと、問題画面の「モチットに聞く」ボタンだけ。別ページは作らない。
// モバイルは画面下のボトムシート、PC は右下のパネル。学習画面を大きく覆わない高さに抑える。
// AI が失敗しても定型文と再試行だけを出し、学習の操作は何も止めない。

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { requestMochitChat, trackMochitEvent } from "@/lib/mochitAi/client";
import {
  pageKindForPath,
  QUESTION_FOLLOW_UPS,
  quickActionsFor,
  topicIdFromPath,
} from "@/lib/mochitAi/pageContext";
import {
  MOCHIT_CHAT_LIMITS,
  type MochitChatMessage,
  type MochitIntent,
  type MochitPageKind,
  type MochitQuickAction,
} from "@/lib/mochitAi/types";
import {
  closeMochitConsult,
  consumeMochitConsultPending,
  getMochitConsultSnapshot,
  publishMochitQuestion,
  type MochitConsultState,
  settleMochitReflection,
  subscribeMochitConsult,
} from "./mochitConsultStore";

type Entry = MochitChatMessage & { id: number; intent?: MochitIntent };
type Failure = { error: string; retry: { message: string; intent?: MochitIntent; source: SendSource } | null };
type SendSource = "quick_action" | "free_input" | "reflection";

const REFLECTION_MESSAGE = "今日の学習を30秒だけ振り返りたい";
const GREETING = "何か手伝えることある？";

function deriveContext(store: MochitConsultState, pathname: string) {
  const question = store.question?.context ?? null;
  const page: MochitPageKind = question ? "question" : pageKindForPath(pathname);
  return { page, question, learnTopicId: topicIdFromPath(pathname) };
}

function greetingFor(page: MochitPageKind, hasQuestion: boolean): string {
  if (hasQuestion) return "この問題のこと、なんでも聞いてね。";
  if (page === "learn") return "この内容で分からないところある？";
  if (page === "progress") return "今の状況について、なんでも聞いてね。";
  return GREETING;
}

export default function MochitConsultSheet({ displayName }: { displayName: string }) {
  const store = useSyncExternalStore(subscribeMochitConsult, getMochitConsultSnapshot, getMochitConsultSnapshot);
  const pathname = usePathname();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [lastIntent, setLastIntent] = useState<MochitIntent | null>(null);
  const [inReflection, setInReflection] = useState(false);
  const nextIdRef = useRef(1);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const conversationKeyRef = useRef<string | null>(null);
  const handledOpenSeqRef = useRef(0);
  // 送信・開いた瞬間の処理は外部ストアの購読から呼ばれるので、最新の値は ref で読む
  const entriesRef = useRef<Entry[]>([]);
  const sendingRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const displayNameRef = useRef(displayName);
  useEffect(() => {
    entriesRef.current = entries;
    pathnameRef.current = pathname;
    displayNameRef.current = displayName;
  });

  const { page, question } = deriveContext(store, pathname);
  const reflectionOffered = store.reflection.status === "offered";

  // 画面を移ったら「モチットに聞く」で渡された問題は手放す（別の画面の問題を答えない）
  useEffect(() => {
    publishMochitQuestion("ask-button", null);
  }, [pathname]);

  const send = async (message: string, options: { intent?: MochitIntent; source: SendSource }) => {
    const text = message.trim();
    if (!text || sendingRef.current) return;
    const context = deriveContext(getMochitConsultSnapshot(), pathnameRef.current);
    const history = entriesRef.current.map(({ role, text: t }) => ({ role, text: t }));
    const id = nextIdRef.current++;
    sendingRef.current = true;
    setEntries((prev) => [...prev, { id, role: "user", text }]);
    setInput("");
    setFailure(null);
    setSending(true);
    const response = await requestMochitChat({
      message: text,
      history,
      page: context.page,
      intent: options.intent,
      source: options.source,
      question: context.question,
      learn: context.learnTopicId ? { topicId: context.learnTopicId } : null,
      today: getMochitConsultSnapshot().today,
      displayName: displayNameRef.current,
    });
    sendingRef.current = false;
    setSending(false);
    if (!response.ok) {
      setFailure({
        error: response.error,
        retry: response.reason === "failed" ? { message: text, intent: options.intent, source: options.source } : null,
      });
      // 失敗した発話は会話から外す（再試行で同じ文を送り直す）
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      return;
    }
    setLastIntent(response.intent);
    setEntries((prev) => [...prev, { id: nextIdRef.current++, role: "mochit", text: response.reply, intent: response.intent }]);
  };
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });

  const close = () => {
    if (entries.some((entry) => entry.role === "mochit")) {
      trackMochitEvent("mochit_return_to_learning", { page, intent: lastIntent ?? undefined });
    }
    closeMochitConsult();
  };

  const startReflection = () => {
    setInReflection(true);
    trackMochitEvent("mochit_reflection_started", { page: deriveContext(getMochitConsultSnapshot(), pathnameRef.current).page, source: "reflection" });
    void sendRef.current(REFLECTION_MESSAGE, { intent: "reflection", source: "reflection" });
  };
  const startReflectionRef = useRef(startReflection);
  useEffect(() => {
    startReflectionRef.current = startReflection;
  });

  // 開いた瞬間の処理：会話の切り替え・計測・保留中の相談の開始（ストアの変化を購読して行う）
  useEffect(
    () =>
      subscribeMochitConsult(() => {
        const snap = getMochitConsultSnapshot();
        if (!snap.open || handledOpenSeqRef.current === snap.openSeq) return;
        handledOpenSeqRef.current = snap.openSeq;
        const context = deriveContext(snap, pathnameRef.current);
        const key = `${context.page}:${context.question?.questionId ?? ""}:${context.learnTopicId ?? ""}`;
        if (conversationKeyRef.current !== key) {
          // 別の画面・別の問題なら新しい相談として始める
          conversationKeyRef.current = key;
          entriesRef.current = [];
          setEntries([]);
          setFailure(null);
          setLastIntent(null);
          setInReflection(false);
        }
        trackMochitEvent("mochit_open", { page: context.page, source: snap.openedFrom ?? "pet" });
        if (snap.pending?.kind === "question") {
          trackMochitEvent("mochit_question_help_opened", { page: "question", source: "button" });
        }
        const pending = snap.pending;
        consumeMochitConsultPending();
        if (pending?.kind === "reflection") startReflectionRef.current();
        // 開いた直後は閉じるボタンではなくシート自体へフォーカスを移す（誤操作で閉じない）
        window.requestAnimationFrame(() => sheetRef.current?.focus());
      }),
    [],
  );

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [entries.length, sending, failure]);

  useEffect(() => {
    if (!store.open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  if (!store.open) return null;

  const handleQuickAction = (action: MochitQuickAction) => {
    trackMochitEvent("mochit_quick_action_clicked", { page, source: action.id, intent: action.intent });
    if (!action.message) {
      inputRef.current?.focus();
      return;
    }
    void send(action.message, { intent: action.intent, source: "quick_action" });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input, { source: inReflection ? "reflection" : "free_input", intent: inReflection ? "reflection" : undefined });
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send(input, { source: inReflection ? "reflection" : "free_input", intent: inReflection ? "reflection" : undefined });
  };

  const finishReflection = (status: "completed" | "dismissed") => {
    trackMochitEvent(status === "completed" ? "mochit_reflection_completed" : "mochit_reflection_dismissed", {
      page,
      source: "reflection",
    });
    settleMochitReflection(status);
    setInReflection(false);
    if (status === "completed") {
      setEntries((prev) => [...prev, { id: nextIdRef.current++, role: "mochit", text: "おつかれさま。また明日ね。" }]);
    } else {
      closeMochitConsult();
    }
  };

  const hasConversation = entries.length > 0;
  const quickActions = quickActionsFor(page);
  const followUps = !sending && lastIntent === "question" ? QUESTION_FOLLOW_UPS : [];
  const reflectionReplied = inReflection && !sending && entries.at(-1)?.role === "mochit" && store.reflection.status === "offered";

  return (
    <>
      <button
        type="button"
        aria-label="モチットとの相談を閉じる"
        tabIndex={-1}
        onClick={close}
        className="fixed inset-0 z-40 cursor-default bg-gray-900/10 lg:hidden"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="false"
        aria-label={`${displayName}に相談する`}
        tabIndex={-1}
        data-testid="mochit-consult-sheet"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(72dvh,560px)] flex-col rounded-t-2xl border border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[380px] lg:rounded-2xl"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
          <span aria-hidden className="text-base">🐾</span>
          <p className="flex-1 text-sm font-medium text-gray-900">{displayName}</p>
          <button
            type="button"
            onClick={close}
            aria-label="閉じる"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <Icon name="x" className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
          {question && !hasConversation && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
              表示中の問題：{question.sourceLabel ? `${question.sourceLabel} ` : ""}
              {question.prompt.length > 40 ? `${question.prompt.slice(0, 40)}…` : question.prompt}
            </p>
          )}

          {!hasConversation && reflectionOffered && !question ? (
            <div className="rounded-xl bg-brand-50 px-3 py-3">
              <p className="text-sm font-medium text-gray-900">今日のミッション完了！</p>
              <p className="mt-0.5 text-xs text-gray-600">よかったら、今日の学習を一緒にふり返ろう。</p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={startReflection}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-black"
                >
                  30秒だけ振り返る
                </button>
                <button
                  type="button"
                  onClick={() => finishReflection("dismissed")}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  今日は終わる
                </button>
              </div>
            </div>
          ) : null}

          {!hasConversation && (
            <p className="mr-10 w-fit rounded-2xl rounded-tl-sm bg-brand-50 px-3 py-2 text-sm leading-relaxed text-gray-900">
              {greetingFor(page, question !== null)}
            </p>
          )}

          {entries.map((entry) =>
            entry.role === "user" ? (
              <p
                key={entry.id}
                className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-gray-900"
              >
                {entry.text}
              </p>
            ) : (
              <p
                key={entry.id}
                className="mr-6 w-fit rounded-2xl rounded-tl-sm bg-brand-50 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-gray-900"
              >
                {entry.text}
              </p>
            ),
          )}

          {sending && (
            <p className="w-fit rounded-2xl rounded-tl-sm bg-brand-50 px-3 py-2 text-sm text-gray-500" role="status">
              考え中…
            </p>
          )}

          {failure && (
            <div className="mr-6 rounded-2xl rounded-tl-sm bg-accent-50 px-3 py-2 text-sm leading-relaxed text-gray-800" role="status">
              <p>{failure.error}</p>
              {failure.retry && (
                <button
                  type="button"
                  onClick={() => failure.retry && void send(failure.retry.message, failure.retry)}
                  className="mt-1.5 text-xs font-medium text-accent-700 underline underline-offset-2"
                >
                  もう一度聞く
                </button>
              )}
            </div>
          )}

          {reflectionReplied && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => finishReflection("completed")}
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
              >
                特になし（終わる）
              </button>
            </div>
          )}

          {!hasConversation && !sending && (
            <div className="flex flex-col items-start gap-2 pt-1">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleQuickAction(action)}
                  className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {followUps.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {followUps.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleQuickAction(action)}
                  className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-gray-100 px-3 py-2.5">
          <label htmlFor="mochit-consult-input" className="sr-only">
            {displayName}に聞く
          </label>
          <textarea
            id="mochit-consult-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={MOCHIT_CHAT_LIMITS.messageMaxLength}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={`${displayName}に聞いてみる…`}
            className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-base leading-snug text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-400 sm:text-sm"
          />
          <button
            type="submit"
            disabled={sending || input.trim().length === 0}
            aria-label="送信"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-black disabled:bg-gray-300"
          >
            <Icon name="arrow-right" className="h-4 w-4 -rotate-90" aria-hidden />
          </button>
        </form>
      </div>
    </>
  );
}
