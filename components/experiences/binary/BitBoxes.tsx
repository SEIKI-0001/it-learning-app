// 2進数の各桁を「箱」で見せる共通部品。
//   箱の上に、その桁の重み（32・16・…・1）と、右に小さく (2ⁿ)。箱の中は 0/1（1 の箱は塗りつぶし）

/** 2のべき乗を、上付き文字つきで表示する */
export function Pow({ n }: { n: number }) {
  return (
    <span className="whitespace-nowrap">
      2<sup className="text-[0.7em] font-bold">{n}</sup>
    </span>
  );
}

const weightsOf = (bits: string) => bits.split("").map((_, i) => 2 ** (bits.length - 1 - i));

/** 重み＋0/1 の箱を1列に。sum のときは 1 の箱の下に足す数を出す */
export function WeightBoxes({ bits, sum = false }: { /** 左（上位）から右（下位）の順 */ bits: string; sum?: boolean }) {
  const ws = weightsOf(bits);
  const d = bits.split("");
  return (
    <div role="group" aria-label={`2進数 ${bits}`} data-testid="bit-boxes" data-bits={bits}>
      <ol className="mx-auto grid max-w-sm gap-1.5" style={{ gridTemplateColumns: `repeat(${d.length}, minmax(0, 1fr))` }}>
        {d.map((b, i) => (
          <li key={i} className="flex flex-col items-stretch text-center" data-bit={b}>
            <span className="whitespace-nowrap pb-1 font-mono text-lg font-bold tabular-nums text-gray-800">
              {ws[i]}
              <span className="font-sans text-[11px] text-gray-400">
                (<Pow n={d.length - 1 - i} />)
              </span>
            </span>
            <span
              className={`grid h-12 place-items-center rounded-lg font-mono text-2xl font-bold ${
                b === "1" ? "bg-brand-600 text-white" : "bg-white text-gray-300 ring-1 ring-inset ring-gray-300"
              }`}
            >
              {b}
            </span>
            {sum && (
              <span
                className={`pt-1 font-mono text-sm font-bold tabular-nums ${b === "1" ? "text-brand-700" : "text-transparent"}`}
                data-testid={b === "1" ? "bit-picked" : undefined}
                aria-hidden
              >
                {b === "1" ? `↓${ws[i]}` : "-"}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 右から size 桁ずつ区切った塊を並べ、それぞれの値を下に出す（8進・16進の共通図）。足りない左は点線の 0 */
export function BitGroups({ bits, size, values }: { bits: string; size: 3 | 4; values: string[] }) {
  const padded = bits.padStart(Math.ceil(bits.length / size) * size, "0");
  const padCount = padded.length - bits.length;
  const groups = Array.from({ length: padded.length / size }, (_, g) => padded.slice(g * size, g * size + size));
  const ws = weightsOf("0".repeat(size));
  return (
    <div className="flex items-start justify-center gap-2">
      {groups.map((g, gi) => (
        <div key={gi} className="flex flex-col items-center" data-testid="bit-group" data-bits={g} data-value={values[gi]}>
          <div className="flex gap-0.5 rounded-lg p-1 ring-2 ring-gray-900">
            {g.split("").map((b, i) => {
              const isPad = gi === 0 && i < padCount;
              return (
                <span key={i} className={`flex flex-col items-center ${size === 4 ? "w-8" : "w-9"}`}>
                  <span className="whitespace-nowrap font-mono text-sm font-bold text-gray-800">
                    {ws[i]}
                    <span className="font-sans text-[10px] text-gray-400">
                      (<Pow n={size - 1 - i} />)
                    </span>
                  </span>
                  <span
                    className={`grid h-8 w-full place-items-center rounded font-mono text-lg font-bold ${
                      isPad
                        ? "border border-dashed border-gray-400 text-gray-400"
                        : b === "1"
                          ? "bg-brand-600 text-white"
                          : "bg-white text-gray-300 ring-1 ring-inset ring-gray-300"
                    }`}
                  >
                    {b}
                  </span>
                </span>
              );
            })}
          </div>
          <span className="text-lg leading-tight text-gray-900" aria-hidden>
            ↓
          </span>
          <span className="font-mono text-3xl font-bold text-gray-900">{values[gi]}</span>
        </div>
      ))}
    </div>
  );
}

/** 16進数の 10〜15 ＝ A〜F の早見（1行） */
export function HexLetters({ mark }: { mark?: string }) {
  return (
    <ul className="mx-auto mt-3 grid max-w-xs grid-cols-6 gap-1 text-center" data-testid="binary-hex-letters">
      {["A", "B", "C", "D", "E", "F"].map((c, i) => (
        <li key={c} className={`rounded-md py-1 ring-1 ${c === mark ? "bg-brand-50 ring-brand-300" : "bg-white ring-gray-200"}`}>
          <div className="font-mono text-base font-bold text-gray-900">{c}</div>
          <div className="font-mono text-[11px] font-bold text-gray-500">{10 + i}</div>
        </li>
      ))}
    </ul>
  );
}
