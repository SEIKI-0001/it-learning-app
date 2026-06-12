'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Module, Lesson } from '@/data/types';
import { getProgress, completeLesson, awardBadge, isLessonCompleted, getLessonScore, getModuleCompletionCount } from '@/lib/progress';
import { getLevel } from '@/lib/level';
import LessonContent from './LessonContent';
import QuizView from './QuizView';
import MascotBubble from './MascotBubble';
import Confetti from './Confetti';

interface Props {
  module: Module;
  lesson: Lesson;
  lessonIndex: number;
  nextLesson: Lesson | null;
}

type Phase = 'reading' | 'quiz' | 'results';

interface QuizResult {
  correct: number;
  total: number;
  xpEarned: number;
  badgeEarned: boolean;
  prevXP: number;
  newXP: number;
}

export default function LessonPage({ module: mod, lesson, lessonIndex, nextLesson }: Props) {
  const [phase, setPhase] = useState<Phase>('reading');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentXP, setCurrentXP] = useState(0);

  useEffect(() => {
    const p = getProgress();
    setCurrentXP(p.totalXP);
    setAlreadyCompleted(isLessonCompleted(mod.id, lesson.id));
    setPrevScore(getLessonScore(mod.id, lesson.id));
  }, [mod.id, lesson.id]);

  function handleQuizComplete(correct: number, total: number) {
    const prevXP = currentXP;
    const progress = completeLesson(mod.id, lesson.id, correct, total);
    const moduleComplete = getModuleCompletionCount(mod.id) === mod.lessons.length;
    let badgeEarned = false;
    if (moduleComplete && !progress.earnedBadges.includes(mod.id)) {
      awardBadge(mod.id);
      badgeEarned = true;
    }
    const baseXP = 50;
    const bonusXP = Math.round((correct / total) * 50);
    const xpEarned = baseXP + bonusXP + (badgeEarned ? 200 : 0);
    const newXP = progress.totalXP + (badgeEarned ? 200 : 0);
    setCurrentXP(newXP);
    setResult({ correct, total, xpEarned, badgeEarned, prevXP, newXP });
    setPhase('results');
    const score = Math.round((correct / total) * 100);
    if (score >= 75) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }

  const scorePercent = result ? Math.round((result.correct / result.total) * 100) : 0;
  const resultLevel = result ? getLevel(result.newXP) : null;
  const prevLevel = result ? getLevel(result.prevXP) : null;
  const leveledUp = result && resultLevel && prevLevel && resultLevel.level > prevLevel.level;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Confetti active={showConfetti} />

      {/* Nav */}
      <div className="flex items-center justify-between mb-5">
        <Link href={`/learn/${mod.id}`} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← {mod.title}
        </Link>
        <div className="flex items-center gap-2">
          {alreadyCompleted && prevScore !== null && (
            <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">
              ✓ 完了済 {prevScore}%
            </span>
          )}
        </div>
      </div>

      {/* Lesson header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            レッスン {lessonIndex + 1} / {mod.lessons.length}
          </span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <span className="text-3xl">{lesson.emoji}</span>
          <span>{lesson.title}</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">⏱ {lesson.duration}で読める</p>
      </div>

      {/* Reading */}
      {phase === 'reading' && (
        <>
          <MascotBubble mood="idle" />
          <LessonContent blocks={lesson.content} />
          <div className="mt-8">
            <button
              onClick={() => setPhase('quiz')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-lg rounded-2xl transition-all shadow-lg shadow-blue-200"
            >
              クイズに挑戦！ 🎯
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
              {lesson.quiz.length}問 · 最大100 XP獲得
            </p>
          </div>
        </>
      )}

      {/* Quiz */}
      {phase === 'quiz' && (
        <>
          <div className="mb-5 bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-sm font-bold text-blue-800">
              📝 {lesson.quiz.length}問のクイズに答えよう！
            </p>
          </div>
          <QuizView questions={lesson.quiz} onComplete={handleQuizComplete} />
        </>
      )}

      {/* Results */}
      {phase === 'results' && result && (
        <div>
          {/* Score */}
          <div className={`rounded-3xl p-6 text-center mb-5 ${
            scorePercent === 100 ? 'bg-green-50 border-2 border-green-400' :
            scorePercent >= 75 ? 'bg-blue-50 border-2 border-blue-300' :
            'bg-orange-50 border-2 border-orange-300'
          }`}>
            <div className="text-6xl mb-2">
              {scorePercent === 100 ? '🎉' : scorePercent >= 75 ? '👍' : '💪'}
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              {scorePercent === 100 ? '満点！パーフェクト！' :
               scorePercent >= 75 ? 'よくできました！' : 'まだまだ成長できる！'}
            </h2>
            <p className="text-gray-600 mb-4">
              {result.correct}/{result.total}問正解（{scorePercent}%）
            </p>
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 font-black px-5 py-2.5 rounded-full border border-yellow-300 text-lg">
              ⚡ +{result.xpEarned} XP獲得！
            </div>
          </div>

          {/* Level up */}
          {leveledUp && resultLevel && (
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-5 text-center text-white mb-5 shadow-lg animate-bounce">
              <div className="text-4xl mb-1">{resultLevel.emoji}</div>
              <p className="font-black text-xl">レベルアップ！</p>
              <p className="text-white/80">Lv.{resultLevel.level} {resultLevel.name} になりました！</p>
            </div>
          )}

          {/* Badge */}
          {result.badgeEarned && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-5 text-center text-white mb-5 shadow-lg">
              <div className="text-4xl mb-1">{mod.badgeEmoji}</div>
              <p className="font-black text-lg">バッジ獲得！</p>
              <p className="text-white/80 text-sm">{mod.badgeName}</p>
              <p className="text-white font-bold text-sm mt-1">+200 ボーナスXP！</p>
            </div>
          )}

          {/* Navigation */}
          <div className="space-y-3">
            {nextLesson ? (
              <Link
                href={`/learn/${mod.id}/${nextLesson.id}`}
                className="block w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-center rounded-2xl transition-all"
                onClick={() => { setPhase('reading'); setResult(null); }}
              >
                次へ: {nextLesson.title} →
              </Link>
            ) : (
              <Link
                href={`/learn/${mod.id}`}
                className="block w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black text-center rounded-2xl transition-all"
              >
                🏁 モジュール完了！概要へ戻る
              </Link>
            )}
            <button
              onClick={() => { setPhase('quiz'); setResult(null); setShowConfetti(false); }}
              className="w-full py-3 border-2 border-gray-200 hover:border-gray-300 text-gray-600 font-medium rounded-2xl transition-all text-sm"
            >
              もう一度挑戦する 🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
