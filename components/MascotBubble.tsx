'use client';

type Mood = 'idle' | 'correct' | 'wrong' | 'thinking' | 'celebrate';

const MESSAGES: Record<Mood, string[]> = {
  idle:      ['一緒に頑張ろう！💪', 'わからなくて当然！焦らずいこう', '読んだら即クイズ！'],
  thinking:  ['考えてみよう…🤔', 'どれだろう？', 'うーん、落ち着いて！'],
  correct:   ['正解！🎉 やったね！', '完璧！さすが✨', 'その調子！🔥', 'すごい！正解だ！'],
  wrong:     ['惜しい！でも大丈夫😊', '次は行ける！💪', '解説を読んでみよう👀', 'ドンマイ！次次！'],
  celebrate: ['🎊 クイズ完了！', '最高だ！🚀', 'どんどん成長してるね！', 'やったぜ！🏆'],
};

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Props {
  mood: Mood;
}

const MASCOT_BG: Record<Mood, string> = {
  idle:      'bg-blue-50 border-blue-200',
  thinking:  'bg-yellow-50 border-yellow-200',
  correct:   'bg-green-50 border-green-300',
  wrong:     'bg-orange-50 border-orange-200',
  celebrate: 'bg-purple-50 border-purple-300',
};

const MASCOT_FACE: Record<Mood, string> = {
  idle:      '🤖',
  thinking:  '🤔',
  correct:   '😄',
  wrong:     '😅',
  celebrate: '🥳',
};

export default function MascotBubble({ mood }: Props) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 mb-4 ${MASCOT_BG[mood]} transition-all duration-300`}>
      <span className="text-3xl shrink-0 animate-bounce">{MASCOT_FACE[mood]}</span>
      <p className="text-sm font-medium text-gray-700">{pick(MESSAGES[mood])}</p>
    </div>
  );
}
