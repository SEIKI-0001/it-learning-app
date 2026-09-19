"use client";

// 配色ラボ本体。2つの表示方法を持つ:
// - アプリ内（/dev/theme-lab）: 実物の /today・/progress を iframe で開く
// - Artifact 版: snapshots（静的に固めた HTML/CSS）を srcdoc で開く
// どちらも iframe の :root 変数を上書きして配色を差し替える。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contrastRatio, normalizeHex } from "@/lib/themeLab/color";
import {
  BACKDROP_SAMPLES,
  PANEL_FILLS,
  PARTS,
  PART_ORDER,
  backdropCss,
  panelFillCss,
  type PanelColorKey,
  type PanelFill,
  type PartKey,
} from "@/lib/themeLab/decor";
import {
  CURRENT_SCALES,
  CURRENT_SURFACES,
  PANEL_COLORS,
  SCALE_ORDER,
  THEME_PRESETS,
  autoPanelHex,
  autoPartHex,
  currentTheme,
  parseTheme,
  themeToCss,
  themeToGlobalsSnippet,
  withAnchor,
  withBackdrop,
  withColorsFrom,
  withPanelColor,
  withPanelFill,
  withPart,
  withStop,
  withSurface,
  type ScaleKey,
  type ThemeState,
} from "@/lib/themeLab/tokens";

export type Snapshot = { css: string; htmlClass: string; body: string };

type Props = {
  /** 指定すると静的スナップショットで表示する（Artifact 版） */
  snapshots?: Record<string, Snapshot>;
  /** 背景サンプルの src を差し替える（Artifact 版はデータURL） */
  assets?: Record<string, string>;
};

type SetTheme = React.Dispatch<React.SetStateAction<ThemeState>>;

const LAB_STORAGE_KEY = "theme-lab:v1";
const CUSTOM_IMAGE_KEY = "theme-lab:custom-image";
const APP_STATE_KEY = "fequest:appstate";
const STYLE_ID = "theme-lab-style";
const BG_STYLE_ID = "theme-lab-bg";

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

// ───────── スナップショット（Artifact 版）用の文書 ─────────

const SNAPSHOT_EXTRA_CSS =
  'html[class]{--font-app-num:"Geist"!important;--font-app-sans:"Zen Kaku Gothic New"!important;--font-app-mono:"Geist Mono"!important}' +
  "a{pointer-events:none}";

const SNAPSHOT_SCRIPT =
  "addEventListener('message',function(e){var d=e.data;if(!d||d.type!=='theme-lab')return;" +
  `document.getElementById('${STYLE_ID}').textContent=d.css;` +
  `if(typeof d.bg==='string')document.getElementById('${BG_STYLE_ID}').textContent=d.bg;});`;

const SNAPSHOT_FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400;500&family=Zen+Kaku+Gothic+New:wght@400;500&display=swap">';

function buildSrcDoc(snap: Snapshot, css: string, bg: string): string {
  return [
    `<!doctype html><html lang="ja" class="${snap.htmlClass}"><head><meta charset="utf-8">`,
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    SNAPSHOT_FONTS,
    `<style>${snap.css}</style><style>${SNAPSHOT_EXTRA_CSS}</style>`,
    `<style id="${STYLE_ID}">${css}</style><style id="${BG_STYLE_ID}">${bg}</style>`,
    `<script>${SNAPSHOT_SCRIPT}</script></head>`,
    snap.body,
    "</html>",
  ].join("");
}

// ───────── 保存（失敗しても表示は続ける） ─────────

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // プライベートモードや容量超過では保存しない
  }
}

function loadSavedTheme(): ThemeState | null {
  const saved = readStorage(LAB_STORAGE_KEY);
  if (!saved) return null;
  try {
    return parseTheme(JSON.parse(saved));
  } catch {
    return null;
  }
}

/** 手元の画像を長辺 1600px の JPEG に縮めてデータURLにする */
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("画像を読み込めませんでした"));
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function ThemeLab({ snapshots, assets }: Props) {
  const snapshotMode = Boolean(snapshots);
  const [theme, setTheme] = useState<ThemeState>(() =>
    snapshotMode ? (loadSavedTheme() ?? currentTheme()) : currentTheme(),
  );
  const [customImage, setCustomImage] = useState<string | null>(() =>
    snapshotMode ? readStorage(CUSTOM_IMAGE_KEY) : null,
  );
  const [loaded, setLoaded] = useState(snapshotMode);
  const [page, setPage] = useState<string>(PAGES[0].path);
  const [device, setDevice] = useState<DeviceId>("phone");
  const [framePath, setFramePath] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // アプリ内版は SSR と揃えるため、保存値は描画後に読む
  useEffect(() => {
    if (snapshotMode) return;
    const saved = loadSavedTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 保存値は描画後にだけ読める
    if (saved) setTheme(saved);
    setCustomImage(readStorage(CUSTOM_IMAGE_KEY));
    setLoaded(true);
  }, [snapshotMode]);

  useEffect(() => {
    if (loaded) writeStorage(LAB_STORAGE_KEY, JSON.stringify(theme));
  }, [theme, loaded]);

  const css = themeToCss(theme);
  const sample = BACKDROP_SAMPLES.find((s) => s.id === theme.backdrop.imageId);
  const bgSrc =
    theme.backdrop.imageId === "custom" ? customImage : sample ? (assets?.[sample.id] ?? sample.src) : null;
  const bgCss = backdropCss(theme.backdrop, bgSrc, sample?.mode ?? "cover");

  const latest = useRef({ css, bgCss });
  useEffect(() => {
    latest.current = { css, bgCss };
  });
  const sentBg = useRef<string | null>(null);

  const inject = useCallback((force = false) => {
    const frame = iframeRef.current;
    if (!frame) return;
    const { css: nextCss, bgCss: nextBg } = latest.current;
    const bgChanged = force || sentBg.current !== nextBg;
    try {
      const doc = frame.contentDocument;
      if (!doc?.head) throw new Error("no document");
      for (const [id, text] of [
        [STYLE_ID, nextCss],
        [BG_STYLE_ID, nextBg],
      ] as const) {
        let el = doc.getElementById(id);
        if (!el) {
          el = doc.createElement("style");
          el.id = id;
          doc.head.appendChild(el);
        }
        if (el.textContent !== text) el.textContent = text;
      }
    } catch {
      // 中を直接さわれないときはメッセージで渡す（背景画像は変わったときだけ）
      frame.contentWindow?.postMessage(
        { type: "theme-lab", css: nextCss, ...(bgChanged ? { bg: nextBg } : {}) },
        "*",
      );
    }
    sentBg.current = nextBg;
  }, []);

  useEffect(() => {
    inject();
  }, [css, bgCss, inject]);

  // アプリ内版: プレビュー内の転送（初回設定画面など）を追う
  useEffect(() => {
    if (snapshotMode) return;
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
  }, [inject, snapshotMode]);

  // スナップショットはページ・画面幅が変わったときだけ作り直す（色の変更は差し替えで反映）
  const srcDoc = useMemo(() => {
    if (!snapshots) return undefined;
    const snap = snapshots[`${page}|${device}`];
    return snap ? buildSrcDoc(snap, "", "") : undefined;
  }, [snapshots, page, device]);

  const needsSample = !snapshotMode && (framePath?.startsWith("/onboarding") ?? false);

  const loadSample = () => {
    if (!readStorage(APP_STATE_KEY)) writeStorage(APP_STATE_KEY, JSON.stringify(SAMPLE_APP_STATE));
    setFrameKey((k) => k + 1);
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(themeToGlobalsSnippet(theme));
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2400);
  };

  const onUpload = async (file: File) => {
    try {
      const dataUrl = await shrinkImage(file);
      setCustomImage(dataUrl);
      writeStorage(CUSTOM_IMAGE_KEY, dataUrl);
      setTheme((t) => withBackdrop(t, { imageId: "custom" }));
    } catch {
      // 読めない形式は無視（選択状態は変えない）
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              {snapshotMode ? "ITパスポート学習コーチ ・ サンプルデータで表示" : "テスト環境専用"}
            </p>
            <h1 className="text-lg font-medium">配色ラボ</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copySnippet}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
            >
              {copied === "done"
                ? "コピーしました"
                : copied === "failed"
                  ? "下の欄から選んでコピーしてください"
                  : "この配色をCSSでコピー"}
            </button>
            <button
              type="button"
              onClick={() => setTheme(currentTheme())}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
            >
              すべて現行に戻す
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          <span className="shrink-0 self-center text-xs text-gray-500">配色プリセット</span>
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setTheme((t) => withColorsFrom(t, preset.build()))}
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
            {snapshotMode ? (
              <span className="ml-auto text-xs text-gray-500">表示のみ（ボタンは動きません）</span>
            ) : (
              <button
                type="button"
                onClick={() => setFrameKey((k) => k + 1)}
                className="ml-auto rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                再読み込み
              </button>
            )}
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
            key={snapshotMode ? "snapshot" : `${page}-${frameKey}`}
            frameRef={iframeRef}
            src={snapshotMode ? undefined : page}
            srcDoc={srcDoc}
            width={DEVICES.find((d) => d.id === device)!.width}
            onLoad={() => inject(true)}
          />
        </section>

        <aside
          aria-label="色の設定"
          className="space-y-7 px-4 py-5 lg:order-1 lg:h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:border-r lg:border-gray-200 lg:bg-white"
        >
          <Group title="背景" note="画面の地と、その後ろに敷く画像。">
            <ColorField
              label={CURRENT_SURFACES.page.label}
              role={CURRENT_SURFACES.page.role}
              value={theme.surfaces.page}
              original={CURRENT_SURFACES.page.value}
              swatches={CURRENT_SURFACES.page.swatches}
              onChange={(hex) => setTheme((t) => withSurface(t, "page", hex))}
            />
            <BackdropField
              theme={theme}
              assets={assets}
              customImage={customImage}
              onSelect={(imageId) => setTheme((t) => withBackdrop(t, { imageId }))}
              onPlacement={(placement) => setTheme((t) => withBackdrop(t, { placement }))}
              onStrength={(strength) => setTheme((t) => withBackdrop(t, { strength }))}
              onUpload={onUpload}
            />
          </Group>

          <Group title="淡いパネル" note="「今日の学習」「合格までの道のり」などの枠。色は未指定ならテーマに連動します。">
            <PanelFillField theme={theme} onChange={(fill) => setTheme((t) => withPanelFill(t, fill))} />
            {PANEL_FILLS.find((f) => f.id === theme.panel.fill)!.colors.map((key) => (
              <PanelColorField key={key} theme={theme} colorKey={key} setTheme={setTheme} />
            ))}
            <ColorField
              label={CURRENT_SURFACES.washLine.label}
              role={CURRENT_SURFACES.washLine.role}
              value={theme.surfaces.washLine}
              original={CURRENT_SURFACES.washLine.value}
              swatches={CURRENT_SURFACES.washLine.swatches}
              onChange={(hex) => setTheme((t) => withSurface(t, "washLine", hex))}
            />
          </Group>

          <Group title="カード・ナビ・ボタン" note="テーマとは別に、部品ごとに色を決められます。">
            <ColorField
              label={CURRENT_SURFACES.surface.label}
              role={CURRENT_SURFACES.surface.role}
              value={theme.surfaces.surface}
              original={CURRENT_SURFACES.surface.value}
              swatches={CURRENT_SURFACES.surface.swatches}
              onChange={(hex) => setTheme((t) => withSurface(t, "surface", hex))}
            />
            {PART_ORDER.map((key) => (
              <PartField key={key} theme={theme} partKey={key} setTheme={setTheme} />
            ))}
          </Group>

          {SCALE_ORDER.map((key) => (
            <ScaleGroup
              key={key}
              scaleKey={key}
              theme={theme}
              title={
                key === "emerald" || key === "gray"
                  ? `その他：${CURRENT_SCALES[key].label}`
                  : CURRENT_SCALES[key].label
              }
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
  frameRef,
  src,
  srcDoc,
  width,
  onLoad,
}: {
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  src?: string;
  srcDoc?: string;
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
          ref={frameRef}
          src={src}
          srcDoc={srcDoc}
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
  auto,
}: {
  label: string;
  role: string;
  value: string;
  original: string;
  swatches: string[];
  onChange: (hex: string) => void;
  /** テーマ連動の色欄。linked=true のあいだは value がテーマから決まる */
  auto?: { linked: boolean; label: string; onReset: () => void };
}) {
  const changed = auto ? !auto.linked : value !== original;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-900">
            {label}
            {changed && <span className="ml-2 text-xs text-brand-700">変更中</span>}
          </p>
          <p className="text-xs text-gray-500">{role}</p>
          {auto &&
            (auto.linked ? (
              <p className="mt-1 text-xs text-gray-500">テーマ連動：{auto.label}</p>
            ) : (
              <button type="button" onClick={auto.onReset} className="mt-1 text-xs text-gray-600 underline">
                テーマ連動（{auto.label}）に戻す
              </button>
            ))}
        </div>
        <HexInput value={value} onChange={onChange} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[...new Set(swatches)].map((hex) => (
          <Swatch
            key={hex}
            hex={hex}
            selected={hex === value && (!auto || !auto.linked)}
            isOriginal={!auto && hex === original}
            onClick={() => onChange(hex)}
          />
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

/** パネルの色に出す見本（今の配色から拾う） */
function themeSwatches(theme: ThemeState): string[] {
  const b = theme.scales.brand.stops;
  const a = theme.scales.accent.stops;
  const e = theme.scales.emerald.stops;
  return [b["50"], b["100"], b["200"], b["300"], a["50"], a["100"], a["200"], e["100"], "#ffffff", theme.scales.gray.stops["100"]];
}

function PanelFillField({ theme, onChange }: { theme: ThemeState; onChange: (fill: PanelFill) => void }) {
  // 見本は選択中の配色で描く（トークン名をこの場の値に置き換える）
  const vars = {
    "--color-brand-50": theme.scales.brand.stops["50"],
    "--color-brand-100": theme.scales.brand.stops["100"],
    "--color-brand-200": theme.scales.brand.stops["200"],
    "--color-brand-300": theme.scales.brand.stops["300"],
    "--color-accent-200": theme.scales.accent.stops["200"],
    "--theme-surface": theme.surfaces.surface,
  } as React.CSSProperties;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-sm text-gray-900">
        塗り方
        {theme.panel.fill !== "flat" && <span className="ml-2 text-xs text-brand-700">変更中</span>}
      </p>
      <div role="radiogroup" aria-label="淡いパネルの塗り方" className="mt-2 grid grid-cols-3 gap-2" style={vars}>
        {PANEL_FILLS.map((fill) => {
          const active = theme.panel.fill === fill.id;
          return (
            <button
              key={fill.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(fill.id)}
              className={`flex flex-col gap-1 rounded-md p-1 text-left ${active ? "ring-2 ring-gray-900" : "hover:bg-gray-50"}`}
            >
              <span className="relative block h-12 overflow-hidden rounded border border-black/10" style={{ background: theme.surfaces.page }}>
                <span
                  className="absolute inset-0"
                  style={{ background: panelFillCss({ ...theme.panel, fill: fill.id }) }}
                />
                {fill.id === "none" && (
                  <span className="absolute inset-1.5 rounded border border-dashed" style={{ borderColor: theme.surfaces.washLine }} />
                )}
              </span>
              <span className="text-xs text-gray-700">{fill.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PanelColorField({ theme, colorKey, setTheme }: { theme: ThemeState; colorKey: PanelColorKey; setTheme: SetTheme }) {
  const def = PANEL_COLORS[colorKey];
  const custom = theme.panel.colors[colorKey];
  const autoHex = autoPanelHex(theme, colorKey);
  return (
    <ColorField
      label={def.label}
      role={colorKey === "dot" ? "指定した色はそのままの濃さで打たれます" : "淡いパネルの色"}
      value={custom ?? autoHex}
      original={autoHex}
      swatches={themeSwatches(theme)}
      onChange={(hex) => setTheme((t) => withPanelColor(t, colorKey, hex))}
      auto={{ linked: !custom, label: def.autoLabel, onReset: () => setTheme((t) => withPanelColor(t, colorKey, null)) }}
    />
  );
}

function PartField({ theme, partKey, setTheme }: { theme: ThemeState; partKey: PartKey; setTheme: SetTheme }) {
  const def = PARTS[partKey];
  const custom = theme.parts[partKey];
  const autoHex = autoPartHex(theme, partKey);
  const g = theme.scales.gray.stops;
  const b = theme.scales.brand.stops;
  const swatches =
    partKey === "cta"
      ? [g["900"], g["800"], b["600"], b["700"], b["800"], theme.scales.accent.stops["600"], theme.scales.emerald.stops["600"], "#000000"]
      : ["#ffffff", g["50"], g["100"], b["50"], b["100"], theme.surfaces.page, g["900"]];
  return (
    <ColorField
      label={def.label}
      role={def.role}
      value={custom ?? autoHex}
      original={autoHex}
      swatches={swatches}
      onChange={(hex) => setTheme((t) => withPart(t, partKey, hex))}
      auto={{ linked: !custom, label: def.autoLabel, onReset: () => setTheme((t) => withPart(t, partKey, null)) }}
    />
  );
}

function BackdropField({
  theme,
  assets,
  customImage,
  onSelect,
  onPlacement,
  onStrength,
  onUpload,
}: {
  theme: ThemeState;
  assets?: Record<string, string>;
  customImage: string | null;
  onSelect: (imageId: string | null) => void;
  onPlacement: (placement: "full" | "top") => void;
  onStrength: (strength: number) => void;
  onUpload: (file: File) => void;
}) {
  const { imageId, placement, strength } = theme.backdrop;
  const selected = BACKDROP_SAMPLES.find((s) => s.id === imageId);
  const tile = (id: string | null, label: string, sub: string, background: string) => {
    const active = imageId === id;
    return (
      <button
        key={id ?? "none"}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onSelect(id)}
        className={`flex flex-col gap-1 rounded-md p-1 text-left ${active ? "ring-2 ring-gray-900" : "hover:bg-gray-50"}`}
      >
        <span className="block h-14 rounded border border-black/10" style={{ background }} />
        <span className="text-xs leading-tight text-gray-800">{label}</span>
        <span className="text-[10px] leading-tight text-gray-500">{sub}</span>
      </button>
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-sm text-gray-900">
        背景画像
        {imageId && <span className="ml-2 text-xs text-brand-700">変更中</span>}
      </p>
      <p className="text-xs text-gray-500">ページの地の上、カードやパネルの後ろに敷きます</p>
      <div role="radiogroup" aria-label="背景画像" className="mt-2 grid grid-cols-3 gap-2">
        {tile(null, "なし", "現行", theme.surfaces.page)}
        {BACKDROP_SAMPLES.map((s) => {
          const src = assets?.[s.id] ?? s.src;
          return tile(
            s.id,
            s.label,
            s.kind,
            s.mode === "tile" ? `url("${src}") 0 0 / 90px 90px repeat` : `url("${src}") center / cover no-repeat`,
          );
        })}
        {customImage && tile("custom", "手元の画像", "アップロード", `url("${customImage}") center / cover no-repeat`)}
      </div>
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50">
        <input
          id="theme-lab-upload"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        手元の画像を使う
      </label>

      {imageId && (
        <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-600">敷き方</span>
            <Segmented
              label="敷き方"
              value={placement}
              options={[
                { value: "full", label: "全面" },
                { value: "top", label: "上部だけ" },
              ]}
              onChange={(v) => onPlacement(v as "full" | "top")}
            />
          </div>
          <label htmlFor="theme-lab-strength" className="block">
            <span className="flex items-center justify-between text-xs text-gray-600">
              <span>画像の濃さ</span>
              <span className="font-mono tabular-nums">{strength}%</span>
            </span>
            <input
              id="theme-lab-strength"
              type="range"
              min={10}
              max={100}
              step={5}
              value={strength}
              onChange={(e) => onStrength(Number(e.target.value))}
              className="mt-1 w-full accent-gray-900"
            />
          </label>
          {selected && <p className="text-[10px] leading-snug text-gray-500">出典：{selected.credit}</p>}
        </div>
      )}
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
  const cta = theme.parts.cta ?? gray.stops["900"];
  const panelBase = theme.panel.fill === "none" ? page : (theme.panel.colors.base ?? brand.stops["50"]);
  const checks = [
    { label: "本文 / ページの地", fg: gray.stops["900"], bg: page },
    { label: "補足の文字 / カードの面", fg: gray.stops["500"], bg: surface },
    { label: "テーマ色の文字（700）/ カードの面", fg: brand.stops["700"], bg: surface },
    { label: "本文 / 淡いパネルの地", fg: gray.stops["900"], bg: panelBase },
    { label: "アクセントの文字（700）/ カードの面", fg: accent.stops["700"], bg: surface },
    { label: "達成の文字（700）/ カードの面", fg: emerald.stops["700"], bg: surface },
    { label: "主ボタンの白文字", fg: "#ffffff", bg: cta },
    { label: "白文字 / テーマ色（600）", fg: "#ffffff", bg: brand.stops["600"] },
  ];
  return (
    <Group
      title="読みやすさチェック"
      note="WCAG のコントラスト比。本文は 4.5 以上が目安。背景画像を敷いたときは画像しだいで変わるので、プレビューでも確かめてください。"
    >
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
