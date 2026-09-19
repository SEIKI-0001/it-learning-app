// テーマ(章)ごとの「アプリアイコン」。/learn の各テーマ行と /today で同じ絵を使う。
// iPhone のホーム画面のように、角の連続したスクワークル＋縦グラデーション＋白い図柄で描く。
// 色は分野で系統を分ける（ストラテジ=暖色／マネジメント=緑系／テクノロジ=青紫系）。
// 分野の中で章ごとに色相をずらし、18章が並んでも1つずつ見分けられるようにする。
// 機能アイコン(components/ui/Icon.tsx の線画)とは役割が違い、こちらは章の「顔」を担う。

import { useId, type ReactNode } from "react";
import type { LearningTheme } from "@/types/learningCatalog";

type Glyph = {
  /** 白で描く図柄。影にも同じ形を使う。fill/stroke は currentColor で描く。 */
  base: ReactNode;
  /** 図柄の上に置く細部。ink(その章の濃い色)で描き、影には含めない。 */
  detail?: (ink: string) => ReactNode;
};

type ThemeAppIconMeta = {
  /** ホーム画面のラベルのような短い章名 */
  shortLabel: string;
  top: string;
  bottom: string;
  ink: string;
  glyph: Glyph;
};

const S = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

const GLYPHS = {
  building: {
    base: (
      <>
        <rect x="56" y="36" width="18" height="40" rx="2.5" fill="currentColor" opacity=".55" />
        <rect x="27" y="23" width="33" height="53" rx="3.5" fill="currentColor" />
        <rect x="22" y="72" width="56" height="5" rx="2.5" fill="currentColor" />
      </>
    ),
    detail: (ink) => (
      <g fill={ink}>
        {[31, 41, 51].map((y) => (
          <g key={y}>
            <rect x="33" y={y} width="8" height="6" rx="1.2" />
            <rect x="46" y={y} width="8" height="6" rx="1.2" />
          </g>
        ))}
        <rect x="39.5" y="61" width="8" height="11" rx="1.5" />
      </g>
    ),
  },
  chart: {
    base: (
      <>
        <g fill="currentColor" opacity=".55">
          <rect x="25" y="60" width="10" height="16" rx="2.5" />
          <rect x="39" y="50" width="10" height="26" rx="2.5" />
          <rect x="53" y="55" width="10" height="21" rx="2.5" />
          <rect x="67" y="40" width="10" height="36" rx="2.5" />
        </g>
        <path d="M28 46 43 33l14 8 15-17" {...S} strokeWidth="5" />
        <circle cx="72" cy="24" r="5.5" fill="currentColor" />
      </>
    ),
  },
  scales: {
    base: (
      <>
        <circle cx="50" cy="23" r="4.5" fill="currentColor" />
        <rect x="47.5" y="25" width="5" height="46" rx="2" fill="currentColor" />
        <rect x="35" y="70" width="30" height="6" rx="3" fill="currentColor" />
        <rect x="23" y="31" width="54" height="5" rx="2.5" fill="currentColor" />
        <path d="M28 36 21 55m7-19 7 19M72 36l-7 19m7-19 7 19" {...S} strokeWidth="2.2" opacity=".7" />
        <path d="M19 55h18a9 9 0 0 1-18 0zM63 55h18a9 9 0 0 1-18 0z" fill="currentColor" />
      </>
    ),
  },
  target: {
    base: (
      <>
        <circle cx="45" cy="55" r="22" {...S} strokeWidth="6" opacity=".55" />
        <circle cx="45" cy="55" r="11.5" {...S} strokeWidth="6" />
        <circle cx="45" cy="55" r="4" fill="currentColor" />
        <path d="M46 54 71 29" {...S} strokeWidth="4.5" />
        <path d="M71 29 70 17l9 3 3 9z" fill="currentColor" />
      </>
    ),
  },
  store: {
    base: (
      <>
        <rect x="28" y="44" width="44" height="32" rx="2.5" fill="currentColor" opacity=".55" />
        <rect x="24" y="25" width="52" height="10" rx="3" fill="currentColor" />
        <path
          d="M24 34h52v5a6.5 6.5 0 0 1-13 0 6.5 6.5 0 0 1-13 0 6.5 6.5 0 0 1-13 0 6.5 6.5 0 0 1-13 0z"
          fill="currentColor"
        />
        <rect x="34" y="54" width="12" height="22" rx="2" fill="currentColor" />
        <rect x="51" y="54" width="15" height="11" rx="2" fill="currentColor" />
      </>
    ),
  },
  bulb: {
    base: (
      <>
        <path
          d="M50 23a18 18 0 0 0-10.5 32.6c1.9 1.4 3 3.5 3 5.9V62h15v-.5c0-2.4 1.1-4.5 3-5.9A18 18 0 0 0 50 23z"
          fill="currentColor"
        />
        <rect x="42.5" y="65" width="15" height="4.5" rx="2.25" fill="currentColor" opacity=".8" />
        <rect x="45" y="72" width="10" height="4.5" rx="2.25" fill="currentColor" opacity=".55" />
        <path d="M24 26l4 4M76 26l-4 4M19 41h5M81 41h-5" {...S} strokeWidth="3.5" opacity=".55" />
      </>
    ),
    detail: (ink) => (
      <path d="M44.5 46l5.5 5 5.5-5M50 51v10" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  code: {
    base: <rect x="21" y="25" width="58" height="50" rx="7" fill="currentColor" />,
    detail: (ink) => (
      <g fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 37h58" strokeWidth="1.5" opacity=".2" />
        <path d="M42 47l-8 7 8 7M58 47l8 7-8 7M53.5 44l-7 20" strokeWidth="4.5" />
        <g fill={ink} stroke="none" opacity=".45">
          <circle cx="28.5" cy="31" r="2.2" />
          <circle cx="35" cy="31" r="2.2" />
          <circle cx="41.5" cy="31" r="2.2" />
        </g>
      </g>
    ),
  },
  gantt: {
    base: (
      <>
        <rect x="21" y="22" width="3.5" height="56" rx="1.75" fill="currentColor" opacity=".55" />
        <rect x="29" y="26" width="26" height="10" rx="5" fill="currentColor" />
        <rect x="41" y="41" width="30" height="10" rx="5" fill="currentColor" opacity=".55" />
        <rect x="52" y="56" width="26" height="10" rx="5" fill="currentColor" />
        <path d="M70 69l6.5 6.5L70 82l-6.5-6.5z" fill="currentColor" />
      </>
    ),
  },
  headset: {
    base: (
      <>
        <path d="M29 55v-7a21 21 0 0 1 42 0v7" {...S} strokeWidth="6" />
        <rect x="21" y="48" width="14" height="21" rx="6" fill="currentColor" />
        <rect x="65" y="48" width="14" height="21" rx="6" fill="currentColor" />
        <path d="M72 68c0 7-5 10.5-13 10.5" {...S} strokeWidth="3.5" opacity=".7" />
        <rect x="47" y="74.5" width="12" height="8" rx="4" fill="currentColor" />
      </>
    ),
  },
  audit: {
    base: (
      <>
        <rect x="22" y="19" width="38" height="52" rx="5" fill="currentColor" opacity=".55" />
        <g fill="currentColor">
          <rect x="29" y="28" width="24" height="4.5" rx="2.25" />
          <rect x="29" y="37" width="17" height="4.5" rx="2.25" />
          <rect x="29" y="46" width="21" height="4.5" rx="2.25" />
        </g>
        <circle cx="60" cy="60" r="13" fill="currentColor" opacity=".3" />
        <circle cx="60" cy="60" r="13" {...S} strokeWidth="5" />
        <path d="M69.5 69.5 78 78" {...S} strokeWidth="7" />
        <path d="M54 60.5l4 4 8-8" {...S} strokeWidth="3.8" />
      </>
    ),
  },
  neural: {
    base: (
      <>
        <path
          d="M27 32 50 42M27 32 50 58M27 50 50 42M27 50 50 58M27 68 50 42M27 68 50 58M50 42 73 50M50 58 73 50"
          {...S}
          strokeWidth="2.5"
          opacity=".55"
        />
        <g fill="currentColor">
          <circle cx="27" cy="32" r="6" />
          <circle cx="27" cy="50" r="6" />
          <circle cx="27" cy="68" r="6" />
          <circle cx="50" cy="42" r="6.5" />
          <circle cx="50" cy="58" r="6.5" />
          <circle cx="73" cy="50" r="8" />
        </g>
      </>
    ),
  },
  flow: {
    base: (
      <>
        <path d="M50 30v7M50 63v6M62 50h9v9" {...S} strokeWidth="3" opacity=".55" />
        <rect x="37" y="19" width="26" height="11" rx="5.5" fill="currentColor" />
        <path d="M50 37l13 13-13 13-13-13z" fill="currentColor" />
        <rect x="37" y="69" width="26" height="11" rx="3" fill="currentColor" />
        <rect x="63" y="59" width="16" height="12" rx="3" fill="currentColor" opacity=".55" />
      </>
    ),
  },
  chip: {
    base: (
      <>
        <g fill="currentColor" opacity=".55">
          {[38, 48, 58].map((p) => (
            <g key={p}>
              <rect x={p} y="19" width="4" height="9" rx="2" />
              <rect x={p} y="72" width="4" height="9" rx="2" />
              <rect x="19" y={p} width="9" height="4" rx="2" />
              <rect x="72" y={p} width="9" height="4" rx="2" />
            </g>
          ))}
        </g>
        <rect x="29" y="29" width="42" height="42" rx="7" fill="currentColor" />
      </>
    ),
    detail: (ink) => (
      <>
        <rect x="39" y="39" width="22" height="22" rx="4" fill={ink} opacity=".85" />
        <rect x="45" y="45" width="10" height="10" rx="2" fill="#fff" opacity=".6" />
      </>
    ),
  },
  gear: {
    base: (
      <>
        <path
          fillRule="evenodd"
          fill="currentColor"
          d="M69.5 43.7L76.4 44.2L76.4 55.8L69.5 56.3A20.5 20.5 0 0 1 68.3 59.3L72.7 64.6L64.6 72.7L59.3 68.3A20.5 20.5 0 0 1 56.3 69.5L55.8 76.4L44.2 76.4L43.7 69.5A20.5 20.5 0 0 1 40.7 68.3L35.4 72.7L27.3 64.6L31.7 59.3A20.5 20.5 0 0 1 30.5 56.3L23.6 55.8L23.6 44.2L30.5 43.7A20.5 20.5 0 0 1 31.7 40.7L27.3 35.4L35.4 27.3L40.7 31.7A20.5 20.5 0 0 1 43.7 30.5L44.2 23.6L55.8 23.6L56.3 30.5A20.5 20.5 0 0 1 59.3 31.7L64.6 27.3L72.7 35.4L68.3 40.7A20.5 20.5 0 0 1 69.5 43.7ZM50 41a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z"
        />
      </>
    ),
  },
  picture: {
    base: (
      <>
        <rect x="21" y="25" width="58" height="50" rx="7" fill="currentColor" opacity=".55" />
        <circle cx="63" cy="40" r="6.5" fill="currentColor" />
        <path d="M21 64 37 48l13 13 8-8 15 15h6a7 7 0 0 1-7 7H28a7 7 0 0 1-7-7z" fill="currentColor" />
      </>
    ),
  },
  database: {
    base: <path d="M27 28v44c0 4.7 10.3 8.5 23 8.5s23-3.8 23-8.5V28c0-4.7-10.3-8.5-23-8.5S27 23.3 27 28z" fill="currentColor" />,
    detail: (ink) => (
      <g fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round">
        <path d="M27 28c0 4.7 10.3 8.5 23 8.5S73 32.7 73 28" opacity=".35" />
        <path d="M27 44c0 4.7 10.3 8.5 23 8.5S73 48.7 73 44" opacity=".6" />
        <path d="M27 59c0 4.7 10.3 8.5 23 8.5S73 63.7 73 59" opacity=".6" />
      </g>
    ),
  },
  globe: {
    base: <circle cx="50" cy="50" r="27" fill="currentColor" />,
    detail: (ink) => (
      <g fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" opacity=".6">
        <ellipse cx="50" cy="50" rx="11.5" ry="27" />
        <path d="M23 50h54M27 36h46M27 64h46" />
      </g>
    ),
  },
  shield: {
    base: <path d="M50 19l25 8.5v18.5c0 16.5-10.5 28-25 33-14.5-5-25-16.5-25-33V27.5z" fill="currentColor" />,
    detail: (ink) => (
      <g fill={ink}>
        <circle cx="50" cy="44" r="6.5" />
        <path d="M46.5 47h7l2.2 13.5h-11.4z" />
      </g>
    ),
  },
} satisfies Record<string, Glyph>;

const META_BY_CHAPTER: Record<number, ThemeAppIconMeta> = {
  // ストラテジ系: 暖色
  1: { shortLabel: "企業活動", top: "#FF8A7A", bottom: "#E94848", ink: "#8E2222", glyph: GLYPHS.building },
  2: { shortLabel: "業務分析", top: "#FFC65C", bottom: "#F2921A", ink: "#8A4E08", glyph: GLYPHS.chart },
  3: { shortLabel: "法務", top: "#FF86A6", bottom: "#DC3F6C", ink: "#861C3C", glyph: GLYPHS.scales },
  4: { shortLabel: "経営戦略", top: "#FFA564", bottom: "#EE6A1E", ink: "#8C380A", glyph: GLYPHS.target },
  5: { shortLabel: "ビジネス", top: "#FFD760", bottom: "#EEAE14", ink: "#7E5904", glyph: GLYPHS.store },
  6: { shortLabel: "システム戦略", top: "#F893D9", bottom: "#CF4EAF", ink: "#752062", glyph: GLYPHS.bulb },
  // マネジメント系: 緑系
  7: { shortLabel: "開発", top: "#63D98E", bottom: "#1FA656", ink: "#0C5E2E", glyph: GLYPHS.code },
  8: { shortLabel: "プロジェクト", top: "#52D6C4", bottom: "#12A193", ink: "#095A52", glyph: GLYPHS.gantt },
  9: { shortLabel: "サービス", top: "#AEDC5C", bottom: "#69AE2A", ink: "#3A6310", glyph: GLYPHS.headset },
  10: { shortLabel: "監査", top: "#55BD8F", bottom: "#1C7A55", ink: "#0C442F", glyph: GLYPHS.audit },
  // テクノロジ系: 青紫系
  11: { shortLabel: "基礎理論", top: "#8595FF", bottom: "#4C57E4", ink: "#232B8C", glyph: GLYPHS.neural },
  12: { shortLabel: "アルゴリズム", top: "#B795FF", bottom: "#7A4BE2", ink: "#41218A", glyph: GLYPHS.flow },
  13: { shortLabel: "ハードウェア", top: "#93ABCD", bottom: "#4F668B", ink: "#24334C", glyph: GLYPHS.chip },
  14: { shortLabel: "ソフトウェア", top: "#6AC8FF", bottom: "#1A8BEB", ink: "#0A4B87", glyph: GLYPHS.gear },
  15: { shortLabel: "情報デザイン", top: "#DE93F7", bottom: "#A04AD7", ink: "#56207A", glyph: GLYPHS.picture },
  16: { shortLabel: "データベース", top: "#62A2FF", bottom: "#2C69D6", ink: "#153675", glyph: GLYPHS.database },
  17: { shortLabel: "ネットワーク", top: "#55D9F3", bottom: "#0EA0CB", ink: "#06566E", glyph: GLYPHS.globe },
  18: { shortLabel: "セキュリティ", top: "#5B77AF", bottom: "#1D3265", ink: "#0C1A3A", glyph: GLYPHS.shield },
};

const FALLBACK_META: ThemeAppIconMeta = {
  shortLabel: "テーマ",
  top: "#A7B0BE",
  bottom: "#6B7584",
  ink: "#2E3440",
  glyph: GLYPHS.bulb,
};

export function getThemeAppIconMeta(theme: Pick<LearningTheme, "chapterNumber">): ThemeAppIconMeta {
  return META_BY_CHAPTER[theme.chapterNumber] ?? FALLBACK_META;
}

// iOS のアプリアイコンに近い、角の連続した輪郭（100x100）。
const SQUIRCLE =
  "M50 0C77.6 0 87.3 0 93.6 6.4 100 12.7 100 22.4 100 50s0 37.3-6.4 43.6C87.3 100 77.6 100 50 100s-37.3 0-43.6-6.4C0 87.3 0 77.6 0 50S0 12.7 6.4 6.4C12.7 0 22.4 0 50 0Z";

// 図柄を中心から少し拡大し、iOS のアイコンに近い余白にする
const GLYPH_SCALE = "translate(50 50) scale(1.1) translate(-50 -50)";

export type ThemeAppIconBadge =
  | { kind: "review"; count: number }
  | { kind: "mastered" }
  | { kind: "fully_mastered" };

export default function ThemeAppIcon({
  theme,
  size = 48,
  badge,
  muted = false,
  label,
  className = "",
}: {
  theme: Pick<LearningTheme, "chapterNumber">;
  size?: number;
  /** 右上の小さなバッジ。復習件数（琥珀）か習得済み（緑）。 */
  badge?: ThemeAppIconBadge;
  /** まだ手をつけていない章を控えめに見せる（色を抜いて薄くする）。 */
  muted?: boolean;
  /** 意味を持たせるときだけ指定する。省略時は装飾扱い。 */
  label?: string;
  className?: string;
}) {
  const meta = getThemeAppIconMeta(theme);
  const uid = useId().replace(/:/g, "");
  const fillId = `tai-fill-${uid}`;
  const glossId = `tai-gloss-${uid}`;
  const clipId = `tai-clip-${uid}`;
  const shadowOffset = size >= 40 ? 2.5 : 2;
  // バッジは小さいアイコンでも読める大きさに保つ
  const badgeSize = Math.max(16, Math.round(size * 0.36));

  return (
    <span
      className={`relative inline-block shrink-0 align-middle ${className}`}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="block"
        style={{
          filter: muted
            ? "grayscale(1) opacity(.42)"
            : `drop-shadow(0 ${size >= 40 ? 2 : 1}px ${size >= 40 ? 3 : 2}px rgba(16,24,40,.14))`,
        }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={meta.top} />
            <stop offset="1" stopColor={meta.bottom} />
          </linearGradient>
          <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".28" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={clipId}>
            <path d={SQUIRCLE} />
          </clipPath>
        </defs>
        <path d={SQUIRCLE} fill={`url(#${fillId})`} />
        <g clipPath={`url(#${clipId})`}>
          <rect width="100" height="100" fill={`url(#${glossId})`} />
          {/* 図柄の影: 同じ形を章の濃い色でずらして置き、白い図柄を浮かせる */}
          <g color={meta.ink} opacity=".28" transform={`translate(0 ${shadowOffset}) ${GLYPH_SCALE}`}>
            {meta.glyph.base}
          </g>
          <g color="#fff" transform={GLYPH_SCALE}>
            {meta.glyph.base}
            {meta.glyph.detail?.(meta.ink)}
          </g>
        </g>
        <path
          d={SQUIRCLE}
          fill="none"
          stroke="#fff"
          strokeOpacity=".22"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {badge && (
        <span
          className={`absolute flex items-center justify-center rounded-full font-medium text-white ring-2 ring-white tabular-nums ${
            badge.kind === "review"
              ? "bg-accent-600"
              : badge.kind === "fully_mastered"
                ? "bg-emerald-700"
                : "bg-emerald-600"
          }`}
          style={{
            top: -badgeSize * 0.3,
            right: -badgeSize * 0.3,
            minWidth: badgeSize,
            height: badgeSize,
            padding: badge.kind === "review" ? `0 ${Math.round(badgeSize * 0.22)}px` : 0,
            fontSize: Math.round(badgeSize * 0.62),
            lineHeight: 1,
          }}
        >
          {badge.kind === "review" ? (
            badge.count > 99 ? "99+" : badge.count
          ) : (
            <svg viewBox="0 0 20 20" width={badgeSize * 0.66} height={badgeSize * 0.66} aria-hidden>
              <path
                d={badge.kind === "fully_mastered" ? "M2.5 10.5l3 3 6-7M9.5 12.5l1 1 6-7" : "M5 10.5l3.2 3.2L15 7"}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      )}
    </span>
  );
}
