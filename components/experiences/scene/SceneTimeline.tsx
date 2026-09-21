// 2.5D シーン共通の操作列：戻る / 再生 / スクラブ / 進む ＋ ステップ一覧。
// ステップ数やラベルは各体験が渡す。見た目は PublicKey / NetworkAddress と揃える。

export function SceneTimeline({
  index,
  steps,
  playing,
  reducedMotion,
  onMove,
  onTogglePlay,
  playLabel,
  timelineLabel,
  startCaption,
  endCaption,
  stepTone,
}: {
  index: number;
  steps: { title: string }[];
  playing: boolean;
  reducedMotion: boolean;
  onMove: (next: number) => void;
  onTogglePlay: () => void;
  /** 再生ボタンの aria-label（例: 「通信を再生」） */
  playLabel: string;
  /** スライダーの aria-label（例: 「通信のタイムライン」） */
  timelineLabel: string;
  startCaption?: string;
  endCaption?: string;
  /** 現在ステップのバーの色（既定=brand） */
  stepTone?: (i: number) => string;
}) {
  const lastIndex = steps.length - 1;
  const current = steps[index];
  return (
    <div data-testid="scene-timeline">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onMove(index - 1)}
          disabled={index === 0}
          className="grid h-9 w-9 flex-none place-items-center rounded-full border border-gray-300 bg-white text-sm font-bold text-gray-800 disabled:opacity-30"
          aria-label="1ステップ戻る"
        >
          ←
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={reducedMotion}
          className="flex-none rounded-full bg-gray-900 px-3.5 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={playing ? "再生を一時停止" : playLabel}
        >
          {playing ? "一時停止" : "再生"}
        </button>
        <input
          type="range"
          min={0}
          max={lastIndex}
          step={1}
          value={index}
          onChange={(event) => onMove(Number(event.target.value))}
          className="min-w-0 flex-1 accent-brand-600"
          aria-label={timelineLabel}
          aria-valuetext={`STEP ${index + 1}：${current?.title ?? ""}`}
        />
        <button
          type="button"
          onClick={() => onMove(index + 1)}
          disabled={index >= lastIndex}
          className="grid h-9 w-9 flex-none place-items-center rounded-full border border-gray-300 bg-white text-sm font-bold text-gray-800 disabled:opacity-30"
          aria-label="1ステップ進む"
        >
          →
        </button>
      </div>
      <ol
        className="mt-2 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        aria-label="ステップ一覧"
      >
        {steps.map((s, i) => (
          <li key={`${i}-${s.title}`}>
            <button
              type="button"
              onClick={() => onMove(i)}
              aria-label={`STEP ${i + 1}：${s.title}`}
              aria-current={i === index ? "step" : undefined}
              className={`h-1.5 w-full rounded-full transition ${
                i === index ? (stepTone?.(i) ?? "bg-brand-600") : i < index ? "bg-gray-400" : "bg-gray-200"
              }`}
            />
          </li>
        ))}
      </ol>
      {(startCaption || endCaption) && (
        <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-gray-500">
          <span>{startCaption}</span>
          <span>{endCaption}</span>
        </div>
      )}
      {reducedMotion && (
        <p className="mt-2 text-[10px] text-gray-500">
          端末の「視差効果を減らす」設定に合わせ、自動再生と移動アニメーションは停止しています。矢印またはスライダーで進められます。
        </p>
      )}
    </div>
  );
}
