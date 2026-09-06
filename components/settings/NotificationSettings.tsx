"use client";

import { useEffect, useState } from "react";
import type { NotificationPreference } from "@/types/notification";
import { REMIND_HOUR_OPTIONS } from "@/types/notification";
import {
  fetchNotificationPreference,
  saveNotificationPreference,
} from "@/lib/userSession";
import Icon from "@/components/ui/Icon";

// GF-P0-006 学習リマインダーの設定。
//
// 明示オプトイン制なので、既定は OFF のまま。ここで「受け取る／受け取らない」と
// 時刻をいつでも変更・停止できる（Acceptance Criteria「設定画面から時刻変更・停止が可能」）。
// 通知設定はサーバー（notification_preferences）だけに持ち、localStorage には持たない
// 端末間で食い違うと「止めたのに届く」が起きるため。

type LoadState = "loading" | "ready" | "unavailable";

export default function NotificationSettings() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [preference, setPreference] = useState<NotificationPreference | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await fetchNotificationPreference();
      if (cancelled) return;
      if (!loaded) {
        setLoadState("unavailable");
        return;
      }
      setPreference(loaded);
      setLoadState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(next: NotificationPreference) {
    // 楽観更新。失敗したら元に戻し、届く/届かないの認識がずれたままにしない。
    const previous = preference;
    setPreference(next);
    setSaving(true);
    setError(null);
    const saved = await saveNotificationPreference(next);
    setSaving(false);
    if (!saved) {
      setPreference(previous);
      setError("設定を保存できませんでした。少し時間をおいて試してください。");
      return;
    }
    setPreference(saved);
    setSavedAt(Date.now());
  }

  if (loadState === "loading") {
    return (
      <fieldset>
        <Legend />
        <p className="text-sm text-gray-500">読み込み中…</p>
      </fieldset>
    );
  }

  if (loadState === "unavailable" || !preference) {
    return (
      <fieldset>
        <Legend />
        <p className="text-sm text-gray-500">
          学習リマインダーは LINE と連携したアカウントで使えます。LINE から
          「はじめる」を送って連携すると、ここで受け取り時刻を設定できます。
        </p>
      </fieldset>
    );
  }

  const timezoneLabel = preference.timezone;

  return (
    <fieldset>
      <Legend />
      <p className="mb-3 text-xs text-gray-500">
        当日まだ学習していないときだけ、LINE でそっとお知らせします。いつでも停止できます。
      </p>

      <button
        type="button"
        onClick={() => void persist({ ...preference, optIn: !preference.optIn })}
        aria-pressed={preference.optIn}
        className={`w-full rounded-lg border px-4 py-3.5 text-left text-base font-semibold transition active:scale-[0.99] ${
          preference.optIn
            ? "border-brand-500 bg-brand-50 text-brand-700"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <Icon
            name={preference.optIn ? "circle-check" : "circle"}
            className={
              preference.optIn ? "h-4 w-4 text-brand-600" : "h-4 w-4 text-gray-400"
            }
          />
          LINEでリマインドを受け取る
        </span>
      </button>

      {preference.optIn && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-gray-600">
              受け取る時刻（{timezoneLabel}）
            </p>
            <div className="grid grid-cols-3 gap-2">
              {REMIND_HOUR_OPTIONS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => void persist({ ...preference, remindHour: hour })}
                  className={`h-12 rounded-lg border text-sm font-semibold transition active:scale-[0.97] ${
                    preference.remindHour === hour
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {hour}:00
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-600">受け取る種類</p>
            <ToggleRow
              label="毎日のリマインド"
              description="設定した時刻に、その日まだ学習していなければ届きます。"
              active={preference.dailyReminder}
              onToggle={() =>
                void persist({ ...preference, dailyReminder: !preference.dailyReminder })
              }
            />
            <ToggleRow
              label="連続学習を続けたいとき"
              description="連続日数があるのに未学習の日だけ、短時間で続けられることを伝えます。"
              active={preference.streakRisk}
              onToggle={() =>
                void persist({ ...preference, streakRisk: !preference.streakRisk })
              }
            />
            <ToggleRow
              label="しばらく空いたとき"
              description="3日以上空いたときに、短い復帰ルートへの案内が届きます。"
              active={preference.comeback}
              onToggle={() =>
                void persist({ ...preference, comeback: !preference.comeback })
              }
            />
          </div>
        </div>
      )}

      <p className="mt-2 min-h-5 text-xs" aria-live="polite">
        {error ? (
          <span className="text-red-600">{error}</span>
        ) : saving ? (
          <span className="text-gray-500">保存中…</span>
        ) : savedAt ? (
          <span className="text-brand-700">通知の設定を保存しました</span>
        ) : null}
      </p>
    </fieldset>
  );
}

function Legend() {
  return (
    <legend className="mb-2 flex items-center gap-2 text-base font-semibold text-gray-900">
      <Icon name="clock" className="h-4 w-4 text-gray-500" />
      学習リマインダー
    </legend>
  );
}

function ToggleRow({
  label,
  description,
  active,
  onToggle,
}: {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`w-full rounded-lg border px-4 py-3 text-left transition active:scale-[0.99] ${
        active
          ? "border-brand-500 bg-brand-50"
          : "border-gray-300 bg-white hover:bg-gray-50"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Icon
          name={active ? "circle-check" : "circle"}
          className={active ? "h-4 w-4 text-brand-600" : "h-4 w-4 text-gray-400"}
        />
        {label}
      </span>
      <span className="mt-1 block pl-6 text-xs text-gray-500">{description}</span>
    </button>
  );
}
