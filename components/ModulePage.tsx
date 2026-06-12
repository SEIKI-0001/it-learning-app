'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Module } from '@/data/types';
import { getProgress, getModuleCompletionCount } from '@/lib/progress';
import { getLevel } from '@/lib/level';
import ProgressBar from './ProgressBar';

interface Props {
  module: Module;
}

export default function ModulePage({ module: mod }: Props) {
  const [completedKeys, setCompletedKeys] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [xp, setXP] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const p = getProgress();
    setCompletedKeys(p.completedLessons);
    setScores(p.lessonScores);
    setXP(p.totalXP);
    setMounted(true);
  }, []);

  const done = mounted ? getModuleCompletionCount(mod.id) : 0;
  const pct = Math.round((done / mod.lessons.length) * 100);
  const level = getLevel(xp);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Nav */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1">
          ← ダッシュボード
        </Link>
        {mounted && (
          <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-full text-sm font-bold text-yellow-700">
            {level.emoji} Lv.{level.level} · ⚡{xp} XP
          </div>
        )}
      </div>

      {/* Module header */}
      <div className={`rounded-3xl bg-gradient-to-br ${mod.gradient} p-6 text-white mb-6 shadow-lg`}>
        <div className="text-5xl mb-2">{mod.emoji}</div>
        <h1 className="text-2xl font-black mb-1">{mod.title}</h1>
        <p className="text-white/80 text-sm mb-4 leading-relaxed">{mod.description}</p>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-white/70">{done}/{mod.lessons.length} レッスン完了</span>
            <span className="text-xs font-black text-white">{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-white/30 rounded-full overflow-hidden">
            <div className="h-2.5 bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Lessons */}
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">レッスン一覧</h2>
      <div className="space-y-3">
        {mod.lessons.map((lesson, idx) => {
          const key = `${mod.id}/${lesson.id}`;
          const isCompleted = completedKeys.includes(key);
          const score = scores[key];

          return (
            <Link key={lesson.id} href={`/learn/${mod.id}/${lesson.id}`} className="block group">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm group-hover:shadow-md group-hover:border-gray-300 transition-all group-hover:-translate-y-0.5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors ${
                  isCompleted ? 'bg-green-100' : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  {isCompleted ? '✅' : lesson.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-medium">レッスン {idx + 1}</span>
                    {score !== undefined && (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        score === 100 ? 'bg-green-100 text-green-700' :
                        score >= 75 ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {score}%
                      </span>
                    )}
                    {score === 100 && <span className="text-xs">⭐</span>}
                  </div>
                  <p className="font-bold text-gray-800 text-sm mt-0.5 leading-tight">{lesson.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">⏱ {lesson.duration}</span>
                  <span className="text-gray-300 group-hover:text-gray-500 transition-colors">→</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Badge teaser / earned */}
      <div className="mt-6">
        {pct < 100 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-yellow-800">
              全レッスン完了で <strong>{mod.badgeEmoji} {mod.badgeName}</strong> バッジ獲得！
            </p>
            <div className="mt-2">
              <ProgressBar value={pct} colorClass="bg-yellow-400" height="h-1.5" />
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-5 text-center text-white shadow-md">
            <div className="text-4xl mb-1">{mod.badgeEmoji}</div>
            <p className="font-black text-lg">{mod.badgeName} バッジ獲得！</p>
            <p className="text-white/80 text-sm mt-0.5">モジュール制覇おめでとう！🎉</p>
          </div>
        )}
      </div>
    </div>
  );
}
