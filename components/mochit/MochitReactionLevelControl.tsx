"use client";
import { useId, useSyncExternalStore } from "react";
import { getFloatingMochitPreferencesSnapshot, getFloatingMochitPreferencesServerSnapshot, parseFloatingMochitPreferences, loadFloatingMochitPreferences, saveFloatingMochitPreferences, subscribeToFloatingMochitPreferences } from "./floatingMochitPreferences";

export default function MochitReactionLevelControl({ menu = false, onChange }: { menu?: boolean; onChange?: () => void }) {
  const id = useId();
  const snapshot = useSyncExternalStore(subscribeToFloatingMochitPreferences, getFloatingMochitPreferencesSnapshot, getFloatingMochitPreferencesServerSnapshot);
  const preferences = parseFloatingMochitPreferences(snapshot);
  const value = preferences.visible ? preferences.reactionLevel ?? "high" : "hidden";
  const choose = (level: "high" | "low" | "hidden") => {
    const current = loadFloatingMochitPreferences();
    saveFloatingMochitPreferences({ ...current, visible: level !== "hidden", ...(level === "hidden" ? {} : { reactionLevel: level }) });
    onChange?.();
  };
  return <div className="mt-3 border-t border-gray-100 pt-3">
    <p id={id} className="mb-2 text-xs font-bold text-gray-700">リアクションレベル</p>
    <div role={menu ? "group" : "radiogroup"} aria-labelledby={id} className="flex gap-1 rounded-xl bg-gray-100 p-1">
      {([['high', '高'], ['low', '低'], ['hidden', '非表示']] as const).map(([level, label]) => menu ? (
        <button key={level} type="button" role="menuitemradio" aria-checked={value === level} onClick={() => choose(level)} className={`min-h-10 flex-1 rounded-lg text-sm font-bold ${value === level ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:bg-white/60'}`}>{label}</button>
      ) : <label key={level} className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm font-bold has-focus-visible:ring-2 has-focus-visible:ring-brand-500 ${value === level ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600'}`}>
        <input className="sr-only" type="radio" name={id} value={level} checked={value === level} onChange={() => choose(level)} />{label}
      </label>)}
    </div>
    <p className="mt-2 text-xs leading-relaxed text-gray-500">{value === 'high' ? '表情豊かに、いっしょに喜び、いっしょに勉強します。' : value === 'low' ? '今までどおり、控えめな動きで寄り添います。' : '設定からいつでも戻せます。'}</p>
  </div>;
}
