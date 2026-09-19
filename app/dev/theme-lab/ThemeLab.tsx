"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { contrastRatio, normalizeHex } from "@/lib/themeLab/color";
import {
  CURRENT_SCALES,
  CURRENT_SURFACES,
  SCALE_ORDER,
  SURFACE_ORDER,
  THEME_PRESETS,
  currentTheme,
  parseTheme,
  themeToCss,
  themeToGlobalsSnippet,
  withAnchor,
  withStop,
  withSurface,
  type ScaleKey,
  type ThemeState,
} from "@/lib/themeLab/tokens";

const LAB_STORAGE_KEY = "theme-lab:v1";
const APP_STATE_KEY = "fequest:appstate";
const STYLE_ID = "theme-lab-style";

const PAGES = [
  { path: "/today", label: "今日" },
  { path: "/progress", label: "進捗" },
] as const;

const DEVICES = [
  { id: "phone", label: "スマホ", width: 390 },
  { id: "desktop", label: "PC", width: 1280 },
] as const;

type DeviceId = (typeof DEVICES)[number]["id"];

// e2e/floating-mochit.spec.ts と同じ、初回設定を終えた直後の利用者
const SAMPLE_APP_STATE = {
  profile: {
    itExperience: "beginner",
    dailyMinutes: "15",
    examPlan: "undecided",
    confidence: 1,
    weekdayMinutes: 15,
    holidayMinutes: 20,
    studyStyle: "balanced",
  },
  progress: {
    level: 1,
    exp: 0,
    streakCount: 0,
    weakTags: [],
    completedTopics: [],
    topicMastery: {},
    reviewQueue: [],
    weeklyPlan: null,
    currentDay: 1,
    completedDays: [],
  },
  answers: [],
};

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // プライベートモード等では保存しない（表示には影響しない）
  }
}

export default function ThemeLab() {
  const [theme, setTheme] = useState<ThemeState>(currentTheme);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState<string>(PAGES[0].path);
  const [device, setDevice] = useState<DeviceId>("phone");
  const [framePath, setFramePath] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const css = themeToCss(theme);

  useEffect(() => {
    const saved = readStorage(LAB_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = parseTheme(JSON.parse(saved));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 保存済みの配色は描画後にだけ読める
        if (parsed) setTheme(parsed);
      } catch {
        // 壊れた保存値は無視して現行配色から始める
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeStorage(LAB_STORAGE_KEY, JSON.stringify(theme));
  }, [theme, loaded]);

  const inject = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.head) return;
    let el = doc.getElementById(STYLE_ID);
    if (!el) {
      el = doc.createElement("style");
      el.id = STYLE_ID;
      doc.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }, [css]);

  useEffect(() => {
    inject();
  }, [inject]);

  // プレビュー内の画面遷移（オンボーディングへの転送など）を追う
  useEffect(() => {
    const timer = window.setInterval(() => {
      try {
        const path = iframeRef.current?.contentWindow?.location.pathname ?? null;
        setFramePath((prev) => (prev === path ? prev : path));
        inject();
      } catch {
        setFramePath(null);
      }
    }, 600);
    return () => window.clearInterval(timer);
  }, [inject]);

  const needsSample = framePath?.startsWith("/onboarding") ?? false;

  const loadSample = () => {
    if (!readStorage(APP_STATE_KEY)) writeStorage(APP_STATE_KEY, JSON.stringify(SAMPLE_APP_STATE));
    setFrameKey((k) => k + 1);
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(themeToGlobalsSnippet(theme));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">テスト環境専用</p>
            <h1 className="text-lg font-medium">配色ラボ</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copySnippet}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
            >
              {copied ? "コピーしました" : "この配色をCSSでコピー"}
            </button>
            <button
              type="button"
              onClick={() => setTheme(currentTheme())}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
            >
              現行に戻す
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          <span className="shrink-0 self-center text-xs text-gray-500">プリセット</span>
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setTheme(preset.build())}
              className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1.5 pr-3 text-sm hover:border-gray-400"
            >
              <PresetDots theme={preset.build()} />
              {preset.label}
            </button>
          ))}
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[400px_minmax(0,1fr)]">
        <section
          aria-label="プレビュー"
          className="sticky top-0 z-10 flex h-[58vh] flex-col border-b border-gray-200 bg-gray-100 lg:order-2 lg:h-[calc(100vh-7.5rem)] lg:border-b-0"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
            <Segmented
              label="ページ"
              value={page}
              options={PAGES.map((p) => ({ value: p.path, label: p.label }))}
              onChange={(value) => setPage(value)}
            />
            <Segmented
              label="画面幅"
              value={device}
              options={DEVICES.map((d) => ({ value: d.id, label: d.label }))}
              onChange={(value) => setDevice(value as DeviceId)}
            />
            <button
              type="button"
              onClick={() => setFrameKey((k) => k + 1)}
              className="ml-auto rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            >
              再読み込み
            </button>
          </div>
          {needsSample && (
            <div className="flex flex-wrap items-center gap-2 border-b border-accent-200 bg-accent-50 px-3 py-2 text-sm">
              <span className="text-accent-800">この環境には学習データがないため、初回設定の画面に移りました。</span>
              <button
                type="button"
                onClick={loadSample}
                className="rounded-md bg-gray-900 px-3 py-1 text-white hover:bg-black"
              >
                サンプルデータで表示
              </button>
            </div>
          )}
          <PreviewFrame
            key={`${page}-${frameKey}`}
            ref={iframeRef}
            src={page}
            width={DEVICES.find((d) => d.id === device)!.width}
            onLoad={inject}
          />
        </section>

        <aside
          aria-label="色の設定"
          className="space-y-6 px-4 py-5 lg:order-1 lg:h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:border-r lg:border-gray-200 lg:bg-white"
        >
          <Group title="背景" note="画面の地と、カード・パネルの面。">
            {SURFACE_ORDER.map((key) => {
              const def = CURRENT_SURFACES[key];
              return (
                <ColorField
                  key={key}
                  label={def.label}
                  role={def.role}
                  value={theme.surfaces[key]}
                  original={def.value}
                  swatches={def.swatches}
                  onChange={(hex) => setTheme((t) => withSurface(t, key, hex))}
                />
              );
            })}
          </Group>

          {SCALE_ORDER.map((key) => (
            <ScaleGroup
              key={key}
              scaleKey={key}
              theme={theme}
              title={key === "emerald" || key === "gray" ? `その他：${CURRENT_SCALES[key].label}` : CURRENT_SCALES[key].label}
              onAnchor={(hex) => setTheme((t) => withAnchor(t, key, hex))}
              onStop={(stop, hex) => setTheme((t) => withStop(t, key, stop, hex))}
            />
          ))}

          <ContrastPanel theme={theme} />

          <details className="rounded-lg border border-gray-200 bg-white">
            <summary className="cursor-pointer px-3 py-2 text-sm text-gray-700">書き出すCSSを見る</summary>
            <pre className="max-h-72 overflow-auto border-t border-gray-200 px-3 py-2 font-mono text-xs leading-relaxed text-gray-700">
              {themeToGlobalsSnippet(theme)}
            </pre>
          </details>
        </aside>
      </div>
    </main>
  );
}

function PresetDots({ theme }: { theme: ThemeState }) {
  const colors = [
    theme.scales.brand.stops["500"],
    theme.scales.accent.stops["500"],
    theme.scales.emerald.stops["500"],
    theme.scales.gray.stops["900"],
  ];
  return (
    <span className="flex -space-x-1" aria-hidden>
      {colors.map((c, i) => (
        <span key={i} className="h-4 w-4 rounded-full border border-white" style={{ background: c }} />
      ))}
    </span>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg bg-gray-100 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1 text-sm ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function PreviewFrame({
  ref,
  src,
  width,
  onLoad,
}: {
  ref: React.Ref<HTMLIFrameElement>;
  src: string;
  width: number;
  onLoad: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 入りきらない幅は縮小して全体を見せる（スマホ幅は原寸を優先）
  const scale = box.width > 0 ? Math.min(1, box.width / width) : 1;
  const frameHeight = scale > 0 ? box.height / scale : box.height;

  return (
    <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-x-0 top-0 flex justify-center">
        <iframe
          ref={ref}
          src={src}
          title="配色プレビュー"
          onLoad={onLoad}
          className="origin-top border-x border-gray-200 bg-white"
          style={{ width, height: frameHeight, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-gray-900">{title}</h2>
        {note && <p className="mt-0.5 text-xs text-gray-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function ColorField({
  label,
  role,
  value,
  original,
  swatches,
  onChange,
}: {
  label: string;
  role: string;
  value: string;
  original: string;
  swatches: string[];
  onChange: (hex: string) => void;
}) {
  const changed = value !== original;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-900">
            {label}
            {changed && <span className="ml-2 text-xs text-brand-700">変更中</span>}
          </p>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
        <HexInput value={value} onChange={onChange} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {swatches.map((hex) => (
          <Swatch key={hex} hex={hex} selected={hex === value} isOriginal={hex === original} onClick={() => onChange(hex)} />
        ))}
      </div>
    </div>
  );
}

function Swatch({
  hex,
  selected,
  isOriginal,
  onClick,
}: {
  hex: string;
  selected: boolean;
  isOriginal?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${hex}${isOriginal ? "（現行）" : ""}`}
      aria-pressed={selected}
      title={`${hex}${isOriginal ? "（現行）" : ""}`}
      className={`relative h-7 w-7 rounded-md border border-black/10 ${selected ? "ring-2 ring-gray-900 ring-offset-2" : ""}`}
      style={{ background: hex }}
    >
      {isOriginal && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-white bg-gray-900" />}
    </button>
  );
}

/** カラーピッカー＋色番号（#RRGGBB）。6桁そろった時点で反映し、3桁や途中の値は確定（Enter・欄外クリック）で反映する。 */
function HexInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const shown = focused ? draft : value;
  const valid = normalizeHex(shown) !== null;

  const commit = (text: string) => {
    const hex = normalizeHex(text);
    if (hex && hex !== value) onChange(hex);
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="カラーパレットで選ぶ"
        className="h-8 w-9 cursor-pointer rounded-md border border-gray-300 bg-white p-0.5"
      />
      <input
        type="text"
        lang="en"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="#2f6fdb"
        value={shown}
        aria-label="色番号"
        aria-invalid={!valid}
        onFocus={(e) => {
          setDraft(value);
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={() => {
          commit(draft);
          setFocused(false);
        }}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          // 6桁そろったら即反映（全角・空白まじりも normalizeHex がそろえる）
          const hex = normalizeHex(text);
          if (hex && text.normalize("NFKC").replace(/[\s#]/g, "").length === 6) commit(hex);
        }}
        onCompositionEnd={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            commit(draft);
            e.currentTarget.blur();
          }
        }}
        className={`w-[5.5rem] rounded-md border px-2 py-1.5 font-mono text-sm ${valid ? "border-gray-300" : "border-rose-400 text-rose-700"}`}
      />
    </div>
  );
}

function ScaleGroup({
  scaleKey,
  theme,
  title,
  onAnchor,
  onStop,
}: {
  scaleKey: ScaleKey;
  theme: ThemeState;
  title: string;
  onAnchor: (hex: string) => void;
  onStop: (stop: string, hex: string) => void;
}) {
  const def = CURRENT_SCALES[scaleKey];
  const scale = theme.scales[scaleKey];
  const [editing, setEditing] = useState<string | null>(null);
  const editingHex = editing ? scale.stops[editing] : null;

  return (
    <Group title={title} note={def.role}>
      <ColorField
        label={`基準色（${def.anchor}）`}
        role={`選ぶと ${Object.keys(def.stops).length} 段すべてが現行と同じ濃淡の刻みで作り直されます`}
        value={scale.anchor}
        original={def.stops[def.anchor]}
        swatches={def.swatches}
        onChange={onAnchor}
      />
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-xs text-gray-500">段ごとに調整（押して個別に変更）</p>
        <div className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-11 lg:grid-cols-6">
          {Object.entries(scale.stops).map(([stop, hex]) => {
            const changed = hex !== def.stops[stop];
            const active = editing === stop;
            return (
              <button
                key={stop}
                type="button"
                onClick={() => setEditing(active ? null : stop)}
                aria-pressed={active}
                aria-label={`${stop} ${hex}`}
                className={`flex flex-col items-stretch rounded-md p-0.5 text-left ${active ? "ring-2 ring-gray-900" : ""}`}
              >
                <span className="h-8 rounded border border-black/10" style={{ background: hex }} />
                <span className="mt-0.5 font-mono text-[10px] leading-tight text-gray-600">
                  {stop}
                  {changed && <span className="text-brand-700">*</span>}
                </span>
              </button>
            );
          })}
        </div>
        {editing && editingHex && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-200 pt-3">
            <p className="text-sm text-gray-700">
              {scaleKey}-{editing}
              {editingHex !== def.stops[editing] && (
                <button
                  type="button"
                  onClick={() => onStop(editing, def.stops[editing])}
                  className="ml-2 text-xs text-gray-500 underline"
                >
                  現行 {def.stops[editing]} に戻す
                </button>
              )}
            </p>
            <HexInput value={editingHex} onChange={(hex) => onStop(editing, hex)} />
          </div>
        )}
      </div>
    </Group>
  );
}

function ContrastPanel({ theme }: { theme: ThemeState }) {
  const { brand, accent, emerald, gray } = theme.scales;
  const { page, surface } = theme.surfaces;
  const checks = [
    { label: "本文 / ページの地", fg: gray.stops["900"], bg: page },
    { label: "補足の文字 / カードの面", fg: gray.stops["500"], bg: surface },
    { label: "テーマ色の文字（700）/ カードの面", fg: brand.stops["700"], bg: surface },
    { label: "本文 / 淡いパネル（テーマ50）", fg: gray.stops["900"], bg: brand.stops["50"] },
    { label: "アクセントの文字（700）/ カードの面", fg: accent.stops["700"], bg: surface },
    { label: "達成の文字（700）/ カードの面", fg: emerald.stops["700"], bg: surface },
    { label: "主ボタンの白文字 / 墨（900）", fg: "#ffffff", bg: gray.stops["900"] },
    { label: "白文字 / テーマ色（600）", fg: "#ffffff", bg: brand.stops["600"] },
  ];
  return (
    <Group title="読みやすさチェック" note="WCAG のコントラスト比。本文は 4.5 以上が目安。">
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {checks.map((check) => {
          const ratio = contrastRatio(check.fg, check.bg);
          const verdict = ratio >= 4.5 ? "良好" : ratio >= 3 ? "大きい文字のみ" : "不足";
          const tone =
            ratio >= 4.5 ? "text-emerald-700" : ratio >= 3 ? "text-accent-700" : "text-rose-700";
          return (
            <li key={check.label} className="flex items-center gap-3 px-3 py-2">
              <span
                className="flex h-7 w-10 shrink-0 items-center justify-center rounded border border-black/10 text-sm"
                style={{ background: check.bg, color: check.fg }}
                aria-hidden
              >
                Aa
              </span>
              <span className="min-w-0 flex-1 text-xs text-gray-700">{check.label}</span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm tabular-nums">{ratio.toFixed(1)}</span>
                <span className={`block text-[10px] ${tone}`}>{verdict}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Group>
  );
}
