"use client";

// Today の「もちっとと集中する」入口。Primary CTA（いまの学習）の邪魔をしないよう、
// 進行表の下に控えめな1行として置く。タイマー自体は Floating Mochit の足元に出るので、
// 集中中・休憩中はここには何も出さない（独立したタイマー画面は作らない）。

import { useSyncExternalStore } from "react";
import Icon from "@/components/ui/Icon";
import {
  getFloatingMochitPreferencesServerSnapshot,
  getFloatingMochitPreferencesSnapshot,
  parseFloatingMochitPreferences,
  subscribeToFloatingMochitPreferences,
} from "@/components/mochit/floatingMochitPreferences";
import { hasFocusBreakOffer } from "@/components/mochit/mochitFocusSession";
import { startMochitFocus } from "@/components/mochit/mochitFocusSessionStore";
import { useMochitFocusSession } from "@/components/mochit/useMochitFocusSession";
import s from "./todayView.module.css";

export default function TodayFocusCta({ displayName }: { displayName: string }) {
  const session = useMochitFocusSession();
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToFloatingMochitPreferences,
    getFloatingMochitPreferencesSnapshot,
    getFloatingMochitPreferencesServerSnapshot,
  );
  // モチットを非表示にしている人には出さない（タイマーの表示先が無いため）
  const petVisible =
    preferencesSnapshot !== null && parseFloatingMochitPreferences(preferencesSnapshot || null).visible;
  if (!petVisible || session.phase !== "idle" || hasFocusBreakOffer(session)) return null;

  const minutes = Math.round(session.config.focusMs / 60_000);
  return (
    <div className={s.focusCta}>
      <button type="button" className={s.focusCtaButton} onClick={() => startMochitFocus()}>
        <Icon name="clock" className={s.focusCtaIcon} aria-hidden />
        {displayName}と{minutes}分集中する
      </button>
      <span className={s.focusCtaNote}>タイマーは{displayName}の足元に出ます</span>
    </div>
  );
}
