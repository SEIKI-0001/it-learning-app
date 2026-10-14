import { missions } from "./missions";

const STORAGE_KEY = "network-quest:v1";
const CHANGE_EVENT = "network-quest:change";

export function readProgress(): string | null {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function parseProgress(raw: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "null");
    if (!parsed || typeof parsed !== "object" || !("completed" in parsed) || !Array.isArray(parsed.completed)) return [];
    return [...new Set(parsed.completed.filter((id): id is string => typeof id === "string" && missions.some((mission) => mission.id === id)))];
  } catch { return []; }
}

export function subscribeProgress(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export function saveProgress(completed: string[]): boolean {
  try {
    // 他のタブでクリアしたミッションも残す。
    const merged = [...new Set([...parseProgress(readProgress()), ...completed])];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: merged }));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch { return false; }
}

export const serverProgress = () => null;
