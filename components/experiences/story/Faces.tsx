import { useId } from "react";
import type { Mood, Who } from "./cast";

export type { Mood };

// ストーリー解説の登場人物の顔（胸から上）。ほかの解説の人物イラスト
// （crypto/CryptoPeopleIllustration）と同じ肌色・塗りのタッチにそろえる。
// 表情は台本の mood で切り替える：normal / smile / worried / surprised。

const SKIN = "#F6D3B8";
const INK = "#2B3140";

const LOOK: Record<Who, { bg: string; shirt: string; collar: string; hair: string }> = {
  // 森さん：新人。ボブの髪、明るい青のシャツに社員証のストラップ
  mori: { bg: "#DCE8FB", shirt: "#3D7BE0", collar: "#FFFFFF", hair: "#3A2A22" },
  // 高木さん：先輩。短髪・眼鏡・紺のジャケット
  takagi: { bg: "#E5E7EB", shirt: "#273449", collar: "#FFFFFF", hair: "#1F2430" },
  // 利用者（社員）：お団子の髪、灰色のカーディガン
  user: { bg: "#F1F1EE", shirt: "#8A8F99", collar: "#E9EAEE", hair: "#5A3A22" },
  // 社長：白髪まじりの短髪、灰色のスーツに赤いネクタイ
  boss: { bg: "#F3EAD9", shirt: "#4B5563", collar: "#FFFFFF", hair: "#A3A8B2" },
  // 宮本さん（内部監査室）：肩までの髪、緑のジャケット
  auditor: { bg: "#E3F1EA", shirt: "#2F7D62", collar: "#FFFFFF", hair: "#2B2522" },
  // 大川さん（弁理士）：ショートの髪、紫のジャケットに金のバッジ
  expert: { bg: "#EEE8F7", shirt: "#6D4C9F", collar: "#FFFFFF", hair: "#5B4A42" },
  // 石田さん（法務）：七三分けの短髪、青緑のベストに胸ポケットのペン
  legal: { bg: "#DFF1EF", shirt: "#0F766E", collar: "#FFFFFF", hair: "#2A211C" },
};

function Hair({ who, color }: { who: Who; color: string }) {
  if (who === "mori")
    return (
      <path
        d="M13.2 28.4 Q10.8 9.8 24 9.6 Q37.2 9.8 34.8 28.4 Q33.6 30.2 31.8 29 Q32.6 21.4 30.8 16 Q26.4 18 22 15.6 Q20.4 17.4 17.4 16.4 Q15.4 20.6 16.2 29 Q14.4 30.2 13.2 28.4 Z"
        fill={color}
      />
    );
  if (who === "boss")
    return (
      <path
        d="M14.6 22.4 Q14 12.6 24 12.2 Q34 12.6 33.4 22.4 Q32.8 17.6 30.4 16.6 Q27 15.2 24 15.8 Q21 15.2 17.6 16.6 Q15.2 17.6 14.6 22.4 Z"
        fill={color}
      />
    );
  if (who === "expert")
    return (
      <path
        d="M13.4 30.4 Q11.4 10.2 24 10 Q36.6 10.2 34.6 30.4 Q33.6 31.6 32.4 30.6 Q33 20.4 31 16.6 Q27.4 18.8 22.6 16.2 Q18.8 18.8 16.8 17.4 Q15 20.6 15.6 30.6 Q14.4 31.6 13.4 30.4 Z"
        fill={color}
      />
    );
  if (who === "legal")
    return (
      <path
        d="M14.4 23.4 Q13.4 10.4 24 10.2 Q34.6 10.4 33.6 23.4 Q33.2 17.4 31.2 15.8 Q25.4 14.6 19.8 18.6 Q18.6 16.4 17 17.2 Q15 19 14.4 23.4 Z"
        fill={color}
      />
    );
  if (who === "auditor")
    return (
      <path
        d="M12.8 35.4 Q10.4 9.8 24 9.6 Q37.6 9.8 35.2 35.4 L31.8 35.4 Q33 22 30.8 16.4 Q25 15.4 20.2 17.8 Q16.6 16.8 16.2 22.4 Q15.4 30 16.2 35.4 Z"
        fill={color}
      />
    );
  if (who === "takagi")
    return (
      <path
        d="M14.6 21.5 Q13.8 10.8 24 10.6 Q34.2 10.8 33.4 21.5 Q32.4 16.4 29.6 15.6 Q22.4 17.6 17.6 15.2 Q15.4 17.4 14.6 21.5 Z"
        fill={color}
      />
    );
  return (
    <>
      <circle cx={24} cy={9.4} r={3.6} fill={color} />
      <path d="M14.6 22 Q14 11.4 24 11.2 Q34 11.4 33.4 22 Q31.2 15.4 24 15.2 Q16.8 15.4 14.6 22 Z" fill={color} />
    </>
  );
}

function Eyes({ mood }: { mood: Mood }) {
  if (mood === "smile")
    return (
      <g fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round">
        <path d="M18.8 23.6 Q20.2 22 21.6 23.6" />
        <path d="M26.4 23.6 Q27.8 22 29.2 23.6" />
      </g>
    );
  const r = mood === "surprised" ? 1.45 : 1.15;
  return (
    <g fill={INK}>
      <ellipse cx={20.2} cy={23.4} rx={r} ry={r * 1.15} />
      <ellipse cx={27.8} cy={23.4} rx={r} ry={r * 1.15} />
    </g>
  );
}

function Brows({ mood }: { mood: Mood }) {
  const d =
    mood === "worried"
      ? ["M18.2 19.8 L21.8 18.6", "M26.2 18.6 L29.8 19.8"]
      : mood === "surprised"
        ? ["M18.4 18.4 Q20.2 17.2 22 18.2", "M26 18.2 Q27.8 17.2 29.6 18.4"]
        : ["M18.4 19.4 Q20.2 18.6 22 19.2", "M26 19.2 Q27.8 18.6 29.6 19.4"];
  return (
    <g fill="none" stroke={INK} strokeWidth={0.9} strokeLinecap="round" opacity={0.75}>
      <path d={d[0]} />
      <path d={d[1]} />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === "smile") return <path d="M21 27.6 Q24 31.2 27 27.6 Z" fill="#C2564B" />;
  if (mood === "surprised") return <ellipse cx={24} cy={28.6} rx={1.4} ry={1.8} fill="#C2564B" />;
  if (mood === "worried")
    return <path d="M21.8 29.4 Q24 27.8 26.2 29.4" fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" />;
  return <path d="M22 28.2 Q24 29.6 26 28.2" fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" />;
}

export function Face({ who, mood = "normal", size = 40 }: { who: Who; mood?: Mood; size?: number }) {
  const c = LOOK[who];
  const clip = `face-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      className="flex-none"
      data-face={who}
      data-mood={mood}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx={24} cy={24} r={24} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width={48} height={48} fill={c.bg} />
        {/* 肩と服 */}
        <path d="M6 50 Q6 37.5 24 36.5 Q42 37.5 42 50 Z" fill={c.shirt} />
        <rect x={21.2} y={31} width={5.6} height={6.6} rx={2} fill={SKIN} />
        <path d="M19.4 36.8 L24 41.4 L28.6 36.8 L26.6 36.2 L24 38.8 L21.4 36.2 Z" fill={c.collar} />
        {who === "mori" && (
          // 社員証のストラップ
          <path d="M17.6 38 L22.6 48 M30.4 38 L25.4 48" stroke="#F59E0B" strokeWidth={1.4} />
        )}
        {who === "takagi" && (
          // ジャケットの襟
          <path d="M19.4 36.8 L22.4 46 L17 40 Z M28.6 36.8 L25.6 46 L31 40 Z" fill="#1A2333" />
        )}
        {who === "user" && <circle cx={24} cy={44.6} r={0.9} fill="#E9EAEE" />}
        {who === "boss" && (
          // ネクタイ
          <path d="M23 37.4 L25 37.4 L25.9 44.6 L24 47.4 L22.1 44.6 Z" fill="#C0392B" />
        )}
        {who === "expert" && (
          // 襟と弁理士のバッジ
          <>
            <path d="M19.4 36.8 L22.6 45 L17.6 40.2 Z M28.6 36.8 L25.4 45 L30.4 40.2 Z" fill="#583C82" />
            <circle cx={16.6} cy={43} r={1.2} fill="#E8B931" />
            {/* イヤリング */}
            <circle cx={14.6} cy={26.6} r={0.9} fill="#E8B931" />
            <circle cx={33.4} cy={26.6} r={0.9} fill="#E8B931" />
          </>
        )}
        {who === "legal" && (
          // ベストの前合わせと胸ポケットのペン
          <>
            <path d="M19.4 36.8 L24 46 L18.2 41.4 Z M28.6 36.8 L24 46 L29.8 41.4 Z" fill="#0B5A54" />
            <path d="M30.6 40.4 L30.6 44.6" stroke="#1F2937" strokeWidth={1} strokeLinecap="round" />
            <path d="M29.2 43.6 L32.4 43.6" stroke="#0B5A54" strokeWidth={1.2} />
          </>
        )}
        {who === "auditor" && (
          // 襟とバッジ
          <>
            <path d="M19.4 36.8 L22.6 45 L17.6 40.2 Z M28.6 36.8 L25.4 45 L30.4 40.2 Z" fill="#256650" />
            <circle cx={31.6} cy={43} r={1.1} fill="#F5C542" />
          </>
        )}
        {/* 頭 */}
        <circle cx={14.8} cy={24} r={2} fill={SKIN} />
        <circle cx={33.2} cy={24} r={2} fill={SKIN} />
        <ellipse cx={24} cy={22.6} rx={9.4} ry={10.4} fill={SKIN} />
        <Hair who={who} color={c.hair} />
        <Brows mood={mood} />
        <Eyes mood={mood} />
        {who === "expert" && (
          // 丸い細縁の眼鏡（高木さんの四角い眼鏡と見分ける）
          <g fill="none" stroke="#7A5C3E" strokeWidth={0.7}>
            <circle cx={20.2} cy={23.4} r={2.7} />
            <circle cx={27.8} cy={23.4} r={2.7} />
            <path d="M22.9 23.2 L25.1 23.2" />
          </g>
        )}
        {who === "takagi" && (
          <g fill="none" stroke={INK} strokeWidth={0.8}>
            <rect x={17.2} y={20.9} width={6} height={4.8} rx={1.8} />
            <rect x={24.8} y={20.9} width={6} height={4.8} rx={1.8} />
            <path d="M23.2 22.8 L24.8 22.8" />
          </g>
        )}
        <ellipse cx={18.2} cy={27} rx={1.6} ry={0.9} fill="#F2A7A0" opacity={0.6} />
        <ellipse cx={29.8} cy={27} rx={1.6} ry={0.9} fill="#F2A7A0" opacity={0.6} />
        <Mouth mood={mood} />
        {mood === "worried" && (
          // 汗
          <path d="M34.6 15.4 Q36.4 18.4 34.6 19.4 Q32.8 18.4 34.6 15.4 Z" fill="#7CC4F2" />
        )}
      </g>
    </svg>
  );
}
