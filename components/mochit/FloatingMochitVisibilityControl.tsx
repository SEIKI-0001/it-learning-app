"use client";

import { useSyncExternalStore } from "react";
import Button from "@/components/ui/Button";
import {
  getFloatingMochitPreferencesServerSnapshot,
  getFloatingMochitPreferencesSnapshot,
  parseFloatingMochitPreferences,
  setFloatingMochitVisibility,
  subscribeToFloatingMochitPreferences,
} from "./floatingMochitPreferences";

export default function FloatingMochitVisibilityControl() {
  const snapshot = useSyncExternalStore(
    subscribeToFloatingMochitPreferences,
    getFloatingMochitPreferencesSnapshot,
    getFloatingMochitPreferencesServerSnapshot,
  );
  const visible =
    snapshot === null
      ? null
      : parseFloatingMochitPreferences(snapshot || null).visible;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-base font-semibold text-gray-900">
        フローティングモチット
      </h2>
      {visible === false ? (
        <>
          <p className="mt-1 text-sm text-gray-600">
            この端末ではモチットが隠れています。いつでも元の場所に戻せます。
          </p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => setFloatingMochitVisibility(true)}
          >
            フローティングモチットを表示
          </Button>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-600">
          {visible === null
            ? "表示状態を確認しています"
            : "フローティングモチットは表示中です"}
        </p>
      )}
    </section>
  );
}
