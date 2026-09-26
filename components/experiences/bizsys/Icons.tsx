// 「身近なビジネスシステム」で使う小さな線画イラスト。
// 装飾ではなく、各しくみが「何をしているか」を一目で伝えるための最小限の図。
// タッチ：白/グレー基調＋ブランド1色（強調）＋意味色（緑＝完了・正しい）のみ。グラデーション・影・絵文字装飾は使わない。

/** POS：バーコードを読む → その場で商品・時刻・数量が記録される */
export function PosIcon() {
  return (
    <svg viewBox="0 0 240 100" className="mx-auto w-full max-w-xs" role="img" aria-label="レジでバーコードを読み取ると、商品・時刻・数量がその場で販売データとして記録される">
      {/* レジ本体 */}
      <rect x="4" y="16" width="48" height="58" rx="4" className="fill-white stroke-gray-900" strokeWidth="2" />
      <rect x="10" y="22" width="36" height="16" rx="2" className="fill-brand-50 stroke-brand-400" strokeWidth="1.5" />
      <text x="28" y="33.5" textAnchor="middle" fontSize="9" className="fill-brand-700 font-bold">
        ¥120
      </text>
      {[0, 1].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={10 + col * 13}
            y={44 + row * 12}
            width="10"
            height="9"
            rx="1.5"
            className="fill-gray-100 stroke-gray-300"
          />
        )),
      )}

      {/* 読み取りビーム */}
      <line x1="54" y1="34" x2="92" y2="46" className="stroke-brand-500" strokeWidth="2" strokeDasharray="4 3" />

      {/* 商品のバーコード */}
      <rect x="92" y="32" width="42" height="28" rx="2" className="fill-white stroke-gray-900" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={97 + i * 5} y={38} width={i % 2 === 0 ? 2 : 1} height="16" className="fill-gray-800" />
      ))}

      {/* 送信の矢印 */}
      <line x1="136" y1="46" x2="158" y2="46" className="stroke-gray-400" strokeWidth="2" />
      <path d="M158 46 l-6 -4 v8 z" className="fill-gray-400" />

      {/* 販売データ */}
      <rect x="162" y="10" width="74" height="70" rx="6" className="fill-white stroke-gray-900" strokeWidth="2" />
      <text x="199" y="23" textAnchor="middle" fontSize="9" className="fill-gray-900 font-bold">
        販売データ
      </text>
      <line x1="170" y1="28" x2="228" y2="28" className="stroke-gray-200" />
      {[
        ["商品", "おにぎり"],
        ["時刻", "12:03"],
        ["数量", "1"],
      ].map(([k, v], i) => (
        <g key={k}>
          <text x="170" y={41 + i * 13} fontSize="8" className="fill-gray-500 font-bold">
            {k}
          </text>
          <text x="228" y={41 + i * 13} textAnchor="end" fontSize="8" className="fill-brand-700 font-bold">
            {v}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** ICカード：内蔵チップをリーダーにかざす → 決済／乗車に使われる */
export function IcCardIcon() {
  return (
    <svg viewBox="0 0 220 92" className="mx-auto w-full max-w-xs" role="img" aria-label="ICカードのチップをリーダーにかざすと、決済や乗車に使われる">
      {/* ICカード */}
      <rect x="6" y="26" width="70" height="44" rx="6" className="fill-white stroke-gray-900" strokeWidth="2" />
      <rect x="16" y="36" width="16" height="12" rx="2" className="fill-brand-100 stroke-brand-500" strokeWidth="1.5" />
      <line x1="20" y1="40" x2="28" y2="40" className="stroke-brand-500" strokeWidth="1" />
      <line x1="20" y1="44" x2="28" y2="44" className="stroke-brand-500" strokeWidth="1" />
      <line x1="16" y1="58" x2="66" y2="58" className="stroke-gray-200" strokeWidth="3" />

      {/* かざす動き */}
      <line x1="80" y1="48" x2="110" y2="48" className="stroke-brand-500" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M110 48 l-6 -4 v8 z" className="fill-brand-500" />

      {/* リーダー */}
      <rect x="116" y="18" width="30" height="56" rx="5" className="fill-gray-900" />
      <rect x="123" y="30" width="16" height="20" rx="2" className="fill-white" />
      <path d="M150 30 q8 8 0 16" className="fill-none stroke-brand-400" strokeWidth="2" />
      <path d="M154 24 q14 16 0 32" className="fill-none stroke-brand-300" strokeWidth="2" />

      {/* 用途 */}
      <g>
        <rect x="164" y="14" width="50" height="26" rx="5" className="fill-emerald-50 stroke-emerald-300" strokeWidth="1.5" />
        <text x="189" y="30.5" textAnchor="middle" fontSize="10" className="fill-emerald-800 font-bold">
          決済
        </text>
      </g>
      <g>
        <rect x="164" y="50" width="50" height="26" rx="5" className="fill-emerald-50 stroke-emerald-300" strokeWidth="1.5" />
        <text x="189" y="66.5" textAnchor="middle" fontSize="10" className="fill-emerald-800 font-bold">
          乗車
        </text>
      </g>
    </svg>
  );
}

/** GPS：複数の衛星からの信号で、今いる位置を求める */
export function GpsIcon() {
  const sats = [
    { x: 20, y: 14 },
    { x: 66, y: 8 },
    { x: 108, y: 20 },
  ];
  const phone = { x: 64, y: 78 };
  return (
    <svg viewBox="0 0 128 96" className="mx-auto w-full max-w-[9rem]" role="img" aria-label="複数の衛星からの信号で、スマホの現在位置を求める">
      {sats.map((s, i) => (
        <g key={i}>
          <rect x={s.x - 10} y={s.y - 6} width="20" height="12" rx="2" className="fill-white stroke-gray-900" strokeWidth="1.5" />
          <line x1={s.x - 14} y1={s.y} x2={s.x - 10} y2={s.y} className="stroke-gray-900" strokeWidth="1.5" />
          <line x1={s.x + 10} y1={s.y} x2={s.x + 14} y2={s.y} className="stroke-gray-900" strokeWidth="1.5" />
          <line x1={s.x} y1={s.y + 6} x2={phone.x} y2={phone.y - 16} className="stroke-brand-400" strokeWidth="1.5" strokeDasharray="3 3" />
        </g>
      ))}
      {/* スマホ */}
      <rect x={phone.x - 12} y={phone.y - 16} width="24" height="34" rx="4" className="fill-white stroke-gray-900" strokeWidth="2" />
      <circle cx={phone.x} cy={phone.y - 4} r="4" className="fill-brand-600" />
      <text x={phone.x} y={phone.y + 24} textAnchor="middle" fontSize="9" className="fill-gray-600 font-bold">
        現在位置
      </text>
    </svg>
  );
}

/** GIS：地図の上に、人口や店舗などの情報を重ねて分析する */
export function GisIcon() {
  return (
    <svg viewBox="0 0 140 96" className="mx-auto w-full max-w-[10rem]" role="img" aria-label="地図の上に人口や店舗の情報を重ねて分析する">
      {/* 地図 */}
      <rect x="6" y="6" width="128" height="76" rx="4" className="fill-white stroke-gray-900" strokeWidth="2" />
      {[1, 2, 3].map((i) => (
        <line key={`v${i}`} x1={6 + i * 32} y1="6" x2={6 + i * 32} y2="82" className="stroke-gray-200" />
      ))}
      {[1, 2].map((i) => (
        <line key={`h${i}`} x1="6" y1={6 + i * 25.3} x2="134" y2={6 + i * 25.3} className="stroke-gray-200" />
      ))}
      <path d="M6 40 q40 -18 70 0 q30 16 58 -4" className="fill-none stroke-gray-400" strokeWidth="1.5" />

      {/* 人口レイヤー（点の密度） */}
      {[
        [30, 22], [40, 30], [26, 34], [46, 24], [36, 40],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" className="fill-brand-300" opacity="0.85" />
      ))}

      {/* 店舗レイヤー */}
      {[
        [70, 50], [96, 34], [112, 58], [86, 66],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 4} y={y - 4} width="8" height="8" className="fill-emerald-500" />
      ))}

      {/* 凡例 */}
      <circle cx="14" cy="90" r="3" className="fill-brand-300" />
      <text x="20" y="92.5" fontSize="8" className="fill-gray-600 font-bold">
        人口
      </text>
      <rect x="46" y="87" width="7" height="7" className="fill-emerald-500" />
      <text x="57" y="92.5" fontSize="8" className="fill-gray-600 font-bold">
        店舗
      </text>
    </svg>
  );
}
