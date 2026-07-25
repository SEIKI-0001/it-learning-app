export type FloatingMochitPoint = {
  x: number;
  y: number;
};

export type FloatingMochitPreferences = {
  visible: boolean;
  position: FloatingMochitPoint | null;
};

export const FLOATING_MOCHIT_STORAGE_KEY = "fequest:floatingMochit:v1";
export const FLOATING_MOCHIT_CHANGE_EVENT =
  "fequest:floating-mochit-change";

export const DEFAULT_FLOATING_MOCHIT_PREFERENCES = {
  visible: true,
  position: null,
} satisfies FloatingMochitPreferences;

export function clampFloatingMochitPosition(
  point: FloatingMochitPoint,
  viewportWidth: number,
  viewportHeight: number,
  petWidth: number,
  petHeight: number,
  margin = 16,
): FloatingMochitPoint {
  const maximumX = Math.max(margin, viewportWidth - petWidth - margin);
  const maximumY = Math.max(margin, viewportHeight - petHeight - margin);

  return {
    x: Math.min(Math.max(point.x, margin), maximumX),
    y: Math.min(Math.max(point.y, margin), maximumY),
  };
}

export function getDefaultFloatingMochitPosition(
  viewportWidth: number,
  viewportHeight: number,
  petWidth: number,
  petHeight: number,
  margin = 16,
): FloatingMochitPoint {
  return clampFloatingMochitPosition(
    {
      x: viewportWidth - petWidth - margin,
      y: margin,
    },
    viewportWidth,
    viewportHeight,
    petWidth,
    petHeight,
    margin,
  );
}

function isFinitePoint(value: unknown): value is FloatingMochitPoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.x === "number" &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === "number" &&
    Number.isFinite(candidate.y)
  );
}

export function parseFloatingMochitPreferences(
  raw: string | null,
): FloatingMochitPreferences {
  if (!raw) return DEFAULT_FLOATING_MOCHIT_PREFERENCES;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_FLOATING_MOCHIT_PREFERENCES;
    }

    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.visible !== "boolean") {
      return DEFAULT_FLOATING_MOCHIT_PREFERENCES;
    }

    return {
      visible: candidate.visible,
      position: isFinitePoint(candidate.position) ? candidate.position : null,
    };
  } catch {
    return DEFAULT_FLOATING_MOCHIT_PREFERENCES;
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadFloatingMochitPreferences(): FloatingMochitPreferences {
  if (!isBrowser()) return DEFAULT_FLOATING_MOCHIT_PREFERENCES;

  try {
    return parseFloatingMochitPreferences(
      window.localStorage.getItem(FLOATING_MOCHIT_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_FLOATING_MOCHIT_PREFERENCES;
  }
}

export function saveFloatingMochitPreferences(
  preferences: FloatingMochitPreferences,
): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      FLOATING_MOCHIT_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // The pet remains usable for this page when browser storage is blocked.
  }

  window.dispatchEvent(
    new CustomEvent<FloatingMochitPreferences>(
      FLOATING_MOCHIT_CHANGE_EVENT,
      {
        detail: preferences,
      },
    ),
  );
}

export function setFloatingMochitVisibility(visible: boolean): void {
  saveFloatingMochitPreferences({
    ...loadFloatingMochitPreferences(),
    visible,
  });
}

export function subscribeToFloatingMochitPreferences(
  listener: (preferences: FloatingMochitPreferences) => void,
): () => void {
  if (!isBrowser()) return () => undefined;

  const handleLocalChange = (event: Event) => {
    listener(
      (event as CustomEvent<FloatingMochitPreferences>).detail ??
        loadFloatingMochitPreferences(),
    );
  };
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== FLOATING_MOCHIT_STORAGE_KEY) return;
    listener(parseFloatingMochitPreferences(event.newValue));
  };

  window.addEventListener(FLOATING_MOCHIT_CHANGE_EVENT, handleLocalChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(FLOATING_MOCHIT_CHANGE_EVENT, handleLocalChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}
