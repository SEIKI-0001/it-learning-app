'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Module } from '@/data/types';
import { getProgress, getModuleCompletionCount, resetProgress } from '@/lib/progress';
import { getLevel, getNextLevel, getLevelProgress } from '@/lib/level';
import ProgressBar from './ProgressBar';

interface Props {
  modules: Module[];
}

export default function Dashboard({ modules }: Props) {
  const [xp, setXP] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const p = getProgress();
    setXP(p.totalXP);
    setBadges(p.earnedBadges);
    const counts: Record<string, number> = {};
    for (const m of modules) counts[m.id] = getModuleCompletionCount(m.id);
    setCompletions(counts);
    setMounted(true);
  }, [modules]);

  const level = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const levelPct = getLevelProgress(xp);
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const totalCompleted = Object.values(completions).reduce((s, c) => s + c, 0);
  const allDone = modules.every((m) => badges.includes(m.id));

  if (!mounted) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🚀</div>
        <h1 className="text-3xl font-black text-gray-900">IT Career Kickstart</h1>
        <p className="text-gray-500 mt-1 text-sm">IT未経験からキャリアスタートへ</p>
      </div>

      {/* Level card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{level.emoji}</span>
            <div>
              <p className="text-xs text-gray-400 font-medium">あなたのレベル</p>
              <p className="font-black text-gray-900">Lv.{level.level} {level.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">獲得XP</p>
            <p className="font-black text-yellow-600 text-xl">⚡ {xp.toLocaleString()}</p>
          </div>
        </div>
        {nextLevel ? (
          <>
            <ProgressBar value={levelPct} colorClass="bg-gradient-to-r from-yellow-400 to-orange-400" height="h-3" />
            <p className="text-xs text-gray-400 mt-1 text-right">
              次のレベル「{nextLevel.emoji} {nextLevel.name}」まで {nextLevel.minXP - xp} XP
            </p>
          </>
        ) : (
          <div className="text-center text-sm font-bold text-violet-600 py-1">🎉 最高レベル達成！</div>
        )}
      </div>

      {/* Overall progress */}
      {totalCompleted > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl p-4 mb-5 text-white shadow-md">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-bold">全体の進捗</span>
            <span className="text-sm font-bold">{totalCompleted}/{totalLessons} レッスン</span>
          </div>
          <div className="w-full h-2.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-2.5 bg-white rounded-full transition-all duration-700"
              style={{ width: `${Math.round((totalCompleted / totalLessons) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Modules */}
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">学習パス</h2>
      <div className="space-y-4 mb-7">
        {modules.map((module) => {
          const done = completions[module.id] ?? 0;
          const pct = Math.round((done / module.lessons.length) * 100);
          const hasBadge = badges.includes(module.id);

          return (
            <Link key={module.id} href={`/learn/${module.id}`} className="block group">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm group-hover:shadow-md group-hover:border-gray-300 transition-all group-hover:-translate-y-0.5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center text-2xl shrink-0 shadow-sm`}>
                    {module.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-gray-900">{module.title}</h3>
                      {hasBadge && <span className="text-lg" title="バッジ獲得！">{module.badgeEmoji}</span>}
                      {pct === 100 && !hasBadge && (
                        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">完了</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{module.tagline}</p>
                    <p className="text-xs text-gray-400">{module.lessons.length} レッスン</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-gray-600 text-xl transition-colors">→</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">{done}/{module.lessons.length} 完了</span>
                    <span className="text-xs font-bold text-gray-600">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} colorClass={`bg-gradient-to-r ${module.gradient}`} height="h-2" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Badges */}
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">バッジコレクション</h2>
      <div className="grid grid-cols-3 gap-3 mb-7">
        {modules.map((m) => {
          const earned = badges.includes(m.id);
          return (
            <div
              key={m.id}
              className={`rounded-2xl border p-4 text-center transition-all ${
                earned ? 'bg-yellow-50 border-yellow-300 shadow-sm scale-105' : 'bg-gray-100 border-gray-200 opacity-50'
              }`}
            >
              <div className="text-3xl mb-1">{earned ? m.badgeEmoji : '🔒'}</div>
              <p className="text-xs font-bold text-gray-700">{m.badgeName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{earned ? '獲得済み！' : `${m.title}完了で獲得`}</p>
            </div>
          );
        })}
        <div className={`rounded-2xl border p-4 text-center transition-all ${
          allDone ? 'bg-yellow-50 border-yellow-300 shadow-sm scale-105' : 'bg-gray-100 border-gray-200 opacity-50'
        }`}>
          <div className="text-3xl mb-1">{allDone ? '🌟' : '🔒'}</div>
          <p className="text-xs font-bold text-gray-700">ITパイオニア</p>
          <p className="text-xs text-gray-400 mt-0.5">{allDone ? '獲得済み！' : '全パス完了で獲得'}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-xs text-gray-400">進捗はブラウザに自動保存されます ✨</p>
        {xp > 0 && (
          <button
            onClick={() => {
              if (confirm('進捗をリセットしてもよいですか？')) {
                resetProgress();
                window.location.reload();
              }
            }}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
          >
            進捗をリセット
          </button>
        )}
      </div>
    </div>
  );
}
