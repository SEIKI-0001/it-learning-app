import type { ReactNode } from "react";

// 教師あり・教師なし・強化学習のスライド冒頭に置く「大枠」。
// 具体例（アニメ）の前に、① ひとことで言うと（たとえ）② どんな流れで学ぶか ③ 何に使うか を先に見せる。
// 流れの番号は、下のアニメの 1 2 3 の丸と同じ番号にそろえる（どの段の話かを結び付けるため）。

export function BigPicture({
  image,
  flow,
  uses,
  testId,
}: {
  /** ひとことで言うと（たとえ）。1文 */
  image: ReactNode;
  /** 学び方の流れ。3〜4段・各1行 */
  flow: ReactNode[];
  /** 使われる場面。1行 */
  uses: ReactNode;
  testId?: string;
}) {
  return (
    <div className="mt-2 space-y-2.5 text-[13px] leading-relaxed text-gray-700 [&_b]:font-bold [&_b:not([data-term])]:text-gray-900" data-testid={testId}>
      <p className="text-sm leading-relaxed text-gray-700">
        <span className="mr-1.5 rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold text-white">ひとことで</span>
        {image}
      </p>
      <ol className="space-y-1 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
        {flow.map((f, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
            <span>{f}</span>
          </li>
        ))}
      </ol>
      <p className="text-[12px] text-gray-600">
        <b className="text-gray-800">使われる場面：</b>
        {uses}
      </p>
    </div>
  );
}

/** 大枠と具体例の区切り。「ここから例で見る」 */
export function ExampleDivider({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 border-t border-dashed border-gray-300 pt-3">
      <p className="text-[13px] leading-relaxed text-gray-700 [&_b]:font-bold [&_b:not([data-term])]:text-gray-900">
        <span className="mr-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200">例で見る</span>
        {children}
      </p>
    </div>
  );
}
