import Mochit from "@/components/mochit/Mochit";

// 初回設定の質問役。Duolingo のように、キャラクターが聞き、選ぶとひと言返す。
// 質問は h1（画面の見出し）として読み上げられ、反応は aria-live で伝える。
export default function CoachBubble({
  question,
  reaction,
}: {
  question: string;
  reaction: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 pt-1" aria-hidden>
        <Mochit size="small" animation="idle" />
      </div>
      <div className="ob-bubble min-w-0 flex-1">
        <h1 className="text-lg font-bold leading-snug tracking-tight text-gray-900">{question}</h1>
        <p key={reaction} className="ob-pop mt-1 text-sm leading-relaxed text-brand-800" aria-live="polite">
          {reaction}
        </p>
      </div>
    </div>
  );
}
