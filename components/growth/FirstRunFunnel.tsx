"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { subscribeMochitEvent } from "@/components/mochit/mochitEventBus";
import { firstRunStorage, reachFirstRunStep as reach } from "@/lib/growth/funnelClient";
import {
  isFirstRunActive,
  isFirstRunStepPending,
  isLessonPath,
} from "@/lib/growth/firstRunFunnel";

/**
 * 登録後、最初の学習問題に着くまでの段階を送る（lib/growth/firstRunFunnel.ts）。画面には何も描画しない。
 * 初回設定のフォームを開いた端末だけが対象（onboarding_view は初回設定ページが送る）。
 * - /today を開いた → today_view
 * - レッスンを開いた → lesson_open
 * - 確認問題（data-funnel-question）が画面に半分以上入った → first_question_view
 * - 問題に初めて答えた（モチットの正解/不正解イベント） → first_answer
 * 学習画面のロジックには手を入れず、URL・DOM・既存のイベントだけを見る。
 */
export default function FirstRunFunnel() {
  const pathname = usePathname();

  useEffect(() => {
    const store = firstRunStorage();
    if (!store || !isFirstRunActive(store)) return;
    if (pathname === "/today") reach("today_view");
    if (isLessonPath(pathname)) reach("lesson_open");
  }, [pathname]);

  useEffect(() => {
    const store = firstRunStorage();
    if (!store || !isFirstRunActive(store)) return;

    const unsubscribe = subscribeMochitEvent((signal) => {
      if (signal.type !== "correct" && signal.type !== "incorrect") return;
      // 問題の目印が無い画面で答えた場合も、答えた以上は問題を見ている。
      reach("first_question_view");
      reach("first_answer");
    });

    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;
    if (isFirstRunStepPending(store, "first_question_view") && "IntersectionObserver" in window) {
      const watched = new WeakSet<Element>();
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            reach("first_question_view");
            io?.disconnect();
            mo?.disconnect();
          }
        },
        { threshold: 0.5 },
      );
      const scan = () => {
        for (const el of document.querySelectorAll("[data-funnel-question]")) {
          if (watched.has(el)) continue;
          watched.add(el);
          io?.observe(el);
        }
      };
      scan();
      mo = new MutationObserver(scan);
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      unsubscribe();
      io?.disconnect();
      mo?.disconnect();
    };
  }, [pathname]);

  return null;
}
