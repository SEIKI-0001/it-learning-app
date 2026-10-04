"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppState } from "@/types";
import type { ReferenceBook, ReferenceStudyPlan } from "@/types/referenceBook";
import { getAllTopics } from "@/lib/content";
import { bookOrderFlag } from "@/lib/bookOrderFlag";
import {
  referenceBookIdentity,
  resolveStudyContext,
  studyOrderKey,
  type StudyContext,
} from "@/lib/studyContext";
import {
  buildReferenceStudyPlan,
  isReferenceStudyPlanCurrent,
  supplementDeadlineFor,
  type BookQueueOptions,
} from "@/lib/bookStudyPlan";
import {
  loadLocalStudyPlans,
  loadReferenceBookSynced,
  persistReferenceStudyPlan,
  subscribeReferenceBookChanges,
} from "@/lib/referenceBookSync";

// ============================================================================
// 画面で使う学習コンテキスト（参考書順かアプリ順か）。判定そのものは
// lib/studyContext の resolveStudyContext（純粋関数）で、ここは材料の読み込みと計画の維持だけ。
//
// アプリ順のユーザー（希望が未設定・機能フラグ off）は参考書を読み込まず、即座に ready になる
// （従来の画面と同じタイミング・同じ結果）。参考書順を希望しているときだけ本を読み込み、
// 読み込み終えるまで ready=false（呼び出し側は今日のルート・タスクを保存しない）。
// ============================================================================

let sharedBook: Promise<ReferenceBook | null> | null = null;

/** SPA セッション内で一度だけ本を同期して読み込む（画面・フックの数だけ DB を叩かない）。 */
function loadSharedBook(): Promise<ReferenceBook | null> {
  if (!sharedBook) sharedBook = loadReferenceBookSynced().catch(() => null);
  return sharedBook;
}

export type StudyContextState = {
  context: StudyContext;
  /** 判定の材料がそろったか（参考書順を希望していて本を読み込み中なら false） */
  ready: boolean;
  /** 今日のキュー・メニュー・週の計画へ渡す参考書順の入力（アプリ順なら null） */
  bookQueue: BookQueueOptions | null;
  /** 計画に依存する保存物の前提の鍵（lib/studyContext の studyOrderKey） */
  orderKey: string;
  plan: ReferenceStudyPlan | null;
  /** 予定日を今日から引き直す（参考書順のときだけ。/plan の「計画を引き直す」） */
  replan: () => void;
};

export function useStudyContext(state: AppState | null | undefined): StudyContextState {
  const flag = bookOrderFlag();
  const profile = state?.profile;
  const wantsBook = flag === "optin" && profile?.studyOrderPreference === "book";
  const topics = useMemo(() => getAllTopics(), []);

  const [book, setBook] = useState<ReferenceBook | null | undefined>(undefined);
  const [plans, setPlans] = useState<Record<string, ReferenceStudyPlan>>({});

  useEffect(() => {
    if (!wantsBook) return;
    let cancelled = false;
    void loadSharedBook().then((loaded) => {
      if (cancelled) return;
      setPlans(loadLocalStudyPlans());
      setBook(loaded);
    });
    const unsubscribe = subscribeReferenceBookChanges((changed) => {
      sharedBook = Promise.resolve(changed);
      setBook(changed);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [wantsBook]);

  const activeBook = wantsBook ? book ?? null : null;
  const ready = !wantsBook || book !== undefined;
  const storedPlan = activeBook ? plans[referenceBookIdentity(activeBook)] ?? null : null;

  const context = useMemo(
    () =>
      resolveStudyContext({
        preference: profile?.studyOrderPreference,
        book: activeBook,
        topics,
        flag,
        examDate: profile?.examDate,
        weekdayMinutes: profile?.weekdayMinutes,
        holidayMinutes: profile?.holidayMinutes,
      }),
    [activeBook, flag, profile?.examDate, profile?.holidayMinutes, profile?.studyOrderPreference, profile?.weekdayMinutes, topics],
  );

  // 参考書順の計画（予定日）。保存済みの計画が今の本・構造・試験日・学習時間に合っていれば
  // それを使い、合っていなければ引き直す（完了済みは保ったまま、残りの予定日だけ）。
  const completedTopics = state?.progress.completedTopics;
  const plan = useMemo((): ReferenceStudyPlan | null => {
    if (!ready || context.effectiveMode !== "book" || !context.order || !context.bookId) return storedPlan;
    if (isReferenceStudyPlanCurrent(storedPlan, { bookId: context.bookId, order: context.order, profile })) {
      return storedPlan;
    }
    return buildReferenceStudyPlan({
      order: context.order,
      bookId: context.bookId,
      topics,
      profile,
      completedTopicIds: completedTopics ?? [],
      now: new Date(),
      previous: storedPlan,
    });
    // completedTopics は引き直すときの材料だけ（完了のたびに引き直さない）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.bookId, context.effectiveMode, context.order, profile, ready, storedPlan, topics]);

  // 引き直した計画を保存する（端末＋ログイン中は DB）。
  useEffect(() => {
    if (plan && plan !== storedPlan) persistReferenceStudyPlan(plan);
  }, [plan, storedPlan]);

  const replan = useCallback(() => {
    if (context.effectiveMode !== "book" || !context.order || !context.bookId) return;
    const next = buildReferenceStudyPlan({
      order: context.order,
      bookId: context.bookId,
      topics,
      profile,
      completedTopicIds: state?.progress.completedTopics ?? [],
      now: new Date(),
      previous: plan,
    });
    persistReferenceStudyPlan(next);
    setPlans((current) => ({ ...current, [next.bookId]: next }));
  }, [context.bookId, context.effectiveMode, context.order, plan, profile, state?.progress.completedTopics, topics]);

  const bookQueue = useMemo((): BookQueueOptions | null => {
    if (context.effectiveMode !== "book" || !context.order) return null;
    const deadline = supplementDeadlineFor(plan);
    return { order: context.order, ...(deadline ? { supplementDeadline: deadline } : {}) };
  }, [context.effectiveMode, context.order, plan]);

  return {
    context,
    ready,
    bookQueue,
    orderKey: studyOrderKey(context, plan?.revision),
    plan,
    replan,
  };
}
