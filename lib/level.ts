export interface Level {
  level: number;
  name: string;
  emoji: string;
  minXP: number;
  maxXP: number;
  color: string;
}

const LEVELS: Level[] = [
  { level: 1, name: 'IT見習い',       emoji: '🌱', minXP: 0,    maxXP: 149,  color: 'text-green-600' },
  { level: 2, name: 'IT研修生',       emoji: '🌿', minXP: 150,  maxXP: 349,  color: 'text-teal-600' },
  { level: 3, name: 'ITジュニア',     emoji: '⭐', minXP: 350,  maxXP: 599,  color: 'text-yellow-600' },
  { level: 4, name: 'IT担当者',       emoji: '🌟', minXP: 600,  maxXP: 899,  color: 'text-orange-500' },
  { level: 5, name: 'ITエンジニア',   emoji: '💫', minXP: 900,  maxXP: 1199, color: 'text-blue-600' },
  { level: 6, name: 'ITプロへの道',   emoji: '🚀', minXP: 1200, maxXP: Infinity, color: 'text-violet-600' },
];

export function getLevel(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(xp: number): Level | null {
  const current = getLevel(xp);
  const next = LEVELS.find((l) => l.level === current.level + 1);
  return next ?? null;
}

export function getLevelProgress(xp: number): number {
  const current = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  const range = next.minXP - current.minXP;
  const earned = xp - current.minXP;
  return Math.round((earned / range) * 100);
}
