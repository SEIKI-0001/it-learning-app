import type { ReactNode } from "react";

// 2進数の各桁を「箱」で見せる共通部品。
//   上段：その桁の 0/1（1 の桁は塗りつぶし）
//   中段：2ⁿ（2の何乗か）
//   下段：その値（128・64・…・1）
// 箱と箱のあいだに「×2」を置き、左へ行くほど2倍になることを見せる。

/** 2のべき乗を、上付き文字つきで表示する */
export function Pow({ n }: { n: number }) {
  return (
    <span className="whitespace-nowrap">
      2<sup className="text-[0.7em] font-bold">{n}</sup>
    </span>
  );
}

export function BitBoxes({
  bits,
  showBits = true,
  showDouble = true,
  sumRow = false,
  label,
}: {
  /** 左（上位）から右（下位）の順。例："101101" */
  bits: string;
  showBits?: boolean;
  showDouble?: boolean;
  /** 箱の下に「1 の桁だけ値を書き、0 の桁は 0」と並べ、足し算の形にする */
  sumRow?: boolean;
  label?: string;
}) {
  const digits = bits.split("");
  const n = digits.length;
  const weights = digits.map((_, i) => 2 ** (n - 1 - i));
  const total = weights.reduce((sum, w, i) => sum + (digits[i] === "1" ? w : 0), 0);

  return (
    <div role="group" aria-label={label ?? `2進数 ${bits}`} data-testid="bit-boxes" data-bits={bits}>
      {showDouble && (
        <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-700" aria-hidden>
          <span className="text-sm leading-none">←</span>
          左へ行くほど 2倍
          <span className="h-px flex-1 bg-gray-300" />
        </div>
      )}
      <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {digits.map((d, i) => {
          const one = d === "1";
          return (
            <li key={i} className="flex flex-col items-stretch text-center" data-bit={showBits ? d : undefined}>
              {showBits && (
                <span
                  className={`grid h-10 place-items-center rounded-t-md font-mono text-xl font-bold ${
                    one ? "bg-brand-600 text-white" : "bg-white text-gray-400 ring-1 ring-inset ring-gray-300"
                  }`}
                >
                  {d}
                </span>
              )}
              <span className={`border-x border-gray-300 bg-gray-50 py-1 text-[13px] font-bold text-gray-900 ${showBits ? "" : "rounded-t-md border-t"}`}>
                <Pow n={n - 1 - i} />
              </span>
              <span className="rounded-b-md border border-gray-300 py-1 font-mono text-[13px] font-bold tabular-nums text-gray-700">
                {weights[i]}
              </span>
            </li>
          );
        })}
      </ol>
      {sumRow && (
        <div className="mt-2" data-testid="bit-sum">
          <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
            {digits.map((d, i) => (
              <li key={i} className={`text-center font-mono text-sm font-bold tabular-nums ${d === "1" ? "text-brand-700" : "text-gray-400"}`}>
                {d === "1" ? weights[i] : 0}
              </li>
            ))}
          </ol>
          <p className="mt-1.5 text-center font-mono text-base font-bold tabular-nums text-gray-900">
            {digits.map((d, i) => (d === "1" ? weights[i] : 0)).join(" + ")} ＝ <span className="text-brand-700">{total}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/** 「2進数 3桁（または4桁）＝ 1桁」のグループ。右から区切った1かたまりと、その値 */
export function BitGroup({ bits, padded = 0, value, caption }: { bits: string; padded?: number; value: string; caption?: ReactNode }) {
  const weights = bits.split("").map((_, i) => 2 ** (bits.length - 1 - i));
  return (
    <div className="flex flex-col items-center rounded-lg p-1.5 ring-1 ring-gray-300" data-testid="bit-group" data-bits={bits} data-value={value}>
      <div className="flex gap-0.5">
        {bits.split("").map((d, i) => (
          <span key={i} className="flex w-7 flex-col items-center">
            <span
              className={`grid h-8 w-full place-items-center rounded font-mono text-lg font-bold ${
                i < padded ? "border border-dashed border-gray-400 text-gray-400" : d === "1" ? "bg-brand-600 text-white" : "bg-white text-gray-500 ring-1 ring-inset ring-gray-300"
              }`}
            >
              {d}
            </span>
            <span className="mt-0.5 font-mono text-[11px] font-bold text-gray-600">{weights[i]}</span>
          </span>
        ))}
      </div>
      <span className="mt-1 text-lg leading-none text-gray-900" aria-hidden>
        ↓
      </span>
      <span className="mt-0.5 font-mono text-2xl font-bold text-gray-900">{value}</span>
      {caption && <span className="mt-0.5 text-[11px] text-gray-600">{caption}</span>}
    </div>
  );
}
