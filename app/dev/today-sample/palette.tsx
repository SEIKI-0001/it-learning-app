"use client";

import { useSyncExternalStore } from "react";
import s from "./today.module.css";

// 配色パターンの比較用（today / progress サンプル共通）。
// 色の定義は today.module.css の [data-palette] にある。選択はページをまたいで保つ。

export const PALETTES = [
  {
    id: "clear",
    label: "B クリア",
    swatches: ["#2f6fdb", "#e08a34", "#16191d"],
  },
  {
    id: "brand",
    label: "ブランド",
    swatches: ["#187bd7", "#f58a17", "#0868c9"],
  },
  {
    id: "mochit",
    label: "ブランド＋モチット",
    swatches: ["#187bd7", "#f58a17", "#7dd3c0"],
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

const STORAGE_KEY = "dev-sample:palette";
const DEFAULT_PALETTE: PaletteId = "clear";
const listeners = new Set<() => void>();

function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((option) => option.id === value);
}

function readPalette(): PaletteId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isPaletteId(stored) ? stored : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function setPalette(id: PaletteId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // 保存できなくても、この画面の中では切り替える
  }
  listeners.forEach((listener) => listener());
}

export function usePalette(): [PaletteId, (id: PaletteId) => void] {
  const palette = useSyncExternalStore(
    subscribe,
    readPalette,
    () => DEFAULT_PALETTE,
  );
  return [palette, setPalette];
}

export function PaletteBar({
  palette,
  onChange,
}: {
  palette: PaletteId;
  onChange: (id: PaletteId) => void;
}) {
  return (
    <div className={s.paletteBar} role="group" aria-label="配色パターン">
      <span className={s.paletteTitle}>配色パターン</span>
      {PALETTES.map((option) => (
        <button
          key={option.id}
          type="button"
          className={s.paletteOption}
          aria-pressed={palette === option.id}
          onClick={() => onChange(option.id)}
        >
          <span className={s.swatches} aria-hidden>
            {option.swatches.map((color) => (
              <span
                key={color}
                className={s.swatch}
                style={{ background: color }}
              />
            ))}
          </span>
          {option.label}
        </button>
      ))}
    </div>
  );
}
