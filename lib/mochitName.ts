// モチットの名前（GF-P1-007・純関数）。
//
// 命名は任意。付けなくても全機能が使え、未設定なら既定名で呼ぶ。
// 入力はユーザーの自由文字列なので、保存前に必ず正規化して安全な形にする。

import type { AppState } from "@/types";
import type { MochitName } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getCheckpointProgress } from "@/lib/checkpoints";

/** 未設定時の表示名。 */
export const DEFAULT_MOCHIT_NAME = "モチット";

/** 名前の最大文字数。吹き出しに収まる長さに抑える。 */
export const MOCHIT_NAME_MAX_LENGTH = 12;

export type MochitNameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "too_long" | "invalid_characters" };

/** 制御文字（改行・タブを含む）。吹き出しやプロフィールの表示が壊れるため受け付けない。 */
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

/**
 * 入力を検証して保存できる形に正規化する。
 *   - 制御文字・改行を含む入力は不正として弾く。
 *   - 前後の空白を落とす。空になったら「未設定」として扱う（empty）。
 *   - 内部の連続空白は1つに畳む。
 *   - 長さは書記素ではなくコードポイントで数える（絵文字を1文字と数えない）。
 */
export function validateMochitName(input: string): MochitNameValidation {
  if (CONTROL_CHARACTERS.test(input)) return { ok: false, reason: "invalid_characters" };

  const value = input.trim().replace(/\s+/g, " ");
  if (value.length === 0) return { ok: false, reason: "empty" };
  if ([...value].length > MOCHIT_NAME_MAX_LENGTH) return { ok: false, reason: "too_long" };
  return { ok: true, value };
}

/** 表示名。未設定なら既定名。 */
export function getMochitDisplayName(state: AppState | null | undefined): string {
  if (!state) return DEFAULT_MOCHIT_NAME;
  const stored = getCheckpointProgress(state).gameful?.mochitName?.value;
  return stored && stored.length > 0 ? stored : DEFAULT_MOCHIT_NAME;
}

/** ユーザーが名前を設定しているか（既定名との区別に使う）。 */
export function hasCustomMochitName(state: AppState): boolean {
  return Boolean(getCheckpointProgress(state).gameful?.mochitName?.value);
}

/**
 * 名前を設定・改名する。不正な入力なら state をそのまま返す。
 * 保存できる形に正規化してから書き込むので、表示側は加工不要。
 */
export function setMochitName(
  state: AppState,
  input: string,
  now: Date = new Date(),
): AppState {
  const result = validateMochitName(input);
  if (!result.ok) return state;

  const cp = state.progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
  const mochitName: MochitName = { value: result.value, updatedAt: now.toISOString() };
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: { ...cp, gameful: { ...cp.gameful, mochitName } },
    },
  };
}

/** 名前を消して既定名に戻す。 */
export function clearMochitName(state: AppState): AppState {
  const cp = getCheckpointProgress(state);
  if (!cp.gameful?.mochitName) return state;
  const gameful = { ...cp.gameful };
  delete gameful.mochitName;
  return {
    ...state,
    progress: { ...state.progress, checkpointProgress: { ...cp, gameful } },
  };
}
