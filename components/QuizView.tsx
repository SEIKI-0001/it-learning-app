'use client';

import { useState } from 'react';
import type { QuizQuestion } from '@/data/types';
import MascotBubble from './MascotBubble';

interface QuizViewProps {
  questions: QuizQuestion[];
  onComplete: (correct: number, total: number) => void;
}

const COMBO_LABELS: Record<number, string> = {
  2: '2問連続正解！🔥',
  3: '3問連続！コンボ！🔥🔥',
  4: '4問連続！最高！🔥🔥🔥',
};

export default function QuizView({ questions, onComplete }: QuizViewProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const isCorrect = selected === q.correctIndex;

  function handleSelect(idx: number) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);

    if (idx === q.correctIndex) {
      const newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo >= 2) {
        setShowCombo(true);
        setTimeout(() => setShowCombo(false), 1800);
      }
    } else {
      setCombo(0);
    }
  }

  function handleNext() {
    if (isLast) {
      const finalCorrect = selected === q.correctIndex ? correctCount : correctCount;
      onComplete(finalCorrect, questions.length);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  function optionStyle(idx: number) {
    const base = 'w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-gray-700 flex items-start gap-3 ';
    if (!answered) return base + 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer hover:scale-[1.01]';
    if (idx === q.correctIndex) return base + 'border-green-500 bg-green-50 scale-[1.01]';
    if (idx === selected) return base + 'border-red-400 bg-red-50 animate-shake';
    return base + 'border-gray-200 opacity-40 cursor-default';
  }

  function optionIcon(idx: number) {
    if (!answered) return String.fromCharCode(65 + idx);
    if (idx === q.correctIndex) return '✓';
    if (idx === selected) return '✗';
    return String.fromCharCode(65 + idx);
  }

  const mascotMood = !answered ? 'thinking' : isCorrect ? 'correct' : 'wrong';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Combo banner */}
      {showCombo && combo >= 2 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 bg-orange-500 text-white font-black text-lg px-6 py-3 rounded-full shadow-xl animate-bounce">
          {COMBO_LABELS[Math.min(combo, 4)] ?? `${combo}問連続！🔥🔥🔥🔥`}
        </div>
      )}

      {/* Progress dots */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">
          問題 {current + 1} / {questions.length}
        </span>
        <div className="flex gap-1.5 items-center">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i < current ? 'w-3 h-3 bg-green-400' :
                i === current ? 'w-4 h-4 bg-blue-500' :
                'w-3 h-3 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Mascot */}
      <MascotBubble mood={mascotMood} />

      {/* Question */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 shadow-sm">
        <p className="text-lg font-bold text-gray-800 leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-4">
        {q.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className={optionStyle(idx)}
          >
            <span
              className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${
                !answered ? 'border-gray-300' :
                idx === q.correctIndex ? 'border-green-500 text-green-600' :
                idx === selected ? 'border-red-400 text-red-500' :
                'border-gray-300'
              }`}
            >
              {optionIcon(idx)}
            </span>
            <span className="leading-snug">{opt}</span>
          </button>
        ))}
      </div>

      {/* Explanation */}
      {answered && (
        <div
          className={`rounded-xl p-4 mb-4 text-sm leading-relaxed border ${
            isCorrect
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-orange-50 text-orange-800 border-orange-200'
          }`}
        >
          <p className="font-bold mb-1">{isCorrect ? '✅ 正解！' : '❌ 不正解…'}</p>
          <p>{q.explanation}</p>
        </div>
      )}

      {answered && (
        <button
          onClick={handleNext}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl transition-all"
        >
          {isLast ? '結果を見る →' : '次の問題 →'}
        </button>
      )}
    </div>
  );
}
