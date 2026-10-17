import Mochit from "@/components/mochit/Mochit";

// 登録画面の「1分後のあなたの画面」。/today の「今日やること」を小さく再現したイメージで、
// 説明文の代わりに、登録すると何が手に入るかを見せる。中身は例（実際の内容は初回設定で決まる）。
const ITEMS = [
  { kind: "解説", title: "CPUとメモリのしくみ", min: 5 },
  { kind: "確認問題", title: "3問で理解をチェック", min: 5 },
  { kind: "単語帳", title: "英略語を5語", min: 5 },
] as const;

export default function PlanPreview() {
  return (
    <figure className="lg-preview" aria-label="登録後に表示される「今日の学習」のイメージ">
      <div className="lg-card">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-bold text-gray-900">今日の学習</p>
          <p className="text-[11px] text-gray-500">
            試験まであと<span className="mx-0.5 font-bold tabular-nums text-gray-900">90</span>日
          </p>
        </div>
        <div className="lg-bar" aria-hidden>
          <span />
        </div>
        <ol className="mt-2.5 space-y-1.5">
          {ITEMS.map((item, i) => (
            <li key={item.kind} className="lg-item" style={{ animationDelay: `${0.35 + i * 0.18}s` }}>
              <span className="lg-num">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold text-brand-700">
                  {item.kind}
                  <span className="ml-1.5 font-normal tabular-nums text-gray-400">{item.min}分</span>
                </span>
                <span className="block truncate text-[13px] font-medium text-gray-900">{item.title}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="lg-coach" aria-hidden>
        <p className="lg-bubble">今日はこれだけでOK！</p>
        <Mochit size="small" animation="bounce" />
      </div>
      <figcaption className="mt-2 text-center text-[11px] text-gray-400">
        登録後の「今日」の画面（イメージ）
      </figcaption>
    </figure>
  );
}
