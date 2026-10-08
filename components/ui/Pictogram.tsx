// 解説の「アイコン枠」。教材内で絵文字を使っていた場所を、線画アイコン(Icon)で置き換える。
// - Pictogram: 淡い角丸タイルに収めた見出し・カード用(旧 text-2xl の絵文字の位置)
// - InlineIcon: 見出しや注記の文頭に添える小さな記号(旧来の「ヒント」「注意」の絵文字の位置)
// 色は意味色コントラクトに合わせて tone で選ぶ。分類ごとに色を変えない。

import Icon, { type IconName } from "./Icon";

type Tone = "brand" | "gray" | "accent" | "emerald" | "rose";

const TILE_TONE: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
  accent: "bg-accent-50 text-accent-700 ring-accent-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
};

const TILE_SIZE = {
  sm: { box: "h-6 w-6 rounded", icon: "h-3.5 w-3.5" },
  md: { box: "h-9 w-9 rounded-md", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12 rounded-lg", icon: "h-6 w-6" },
} as const;

export function Pictogram({
  name,
  size = "md",
  tone = "brand",
  label,
  className = "",
}: {
  name: IconName;
  size?: keyof typeof TILE_SIZE;
  tone?: Tone;
  /** 意味を持つときだけ。省略時は装飾扱い */
  label?: string;
  className?: string;
}) {
  const s = TILE_SIZE[size];
  return (
    <span className={`inline-flex flex-none items-center justify-center ring-1 ${s.box} ${TILE_TONE[tone]} ${className}`}>
      <Icon name={name} label={label} className={s.icon} />
    </span>
  );
}

/** 文中・見出しの頭に添える小アイコン。文字のベースラインにそろえる。 */
export function InlineIcon({ name, className = "text-current" }: { name: IconName; className?: string }) {
  return <Icon name={name} className={`mr-1 inline-block h-[1.1em] w-[1.1em] flex-none -translate-y-px align-middle ${className}`} />;
}

export default Pictogram;
