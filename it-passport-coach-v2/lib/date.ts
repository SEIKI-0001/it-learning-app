import type { Weekday } from "@/types/user";

export const weekdayOrder: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

export const weekdayLabels: Record<Weekday, string> = {
  sunday: "日",
  monday: "月",
  tuesday: "火",
  wednesday: "水",
  thursday: "木",
  friday: "金",
  saturday: "土"
};

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

export function getWeekday(date = new Date()): Weekday {
  return weekdayOrder[date.getDay()];
}

export function isSameDay(isoDateTime: string, isoDate = todayISO()): boolean {
  return isoDateTime.slice(0, 10) === isoDate;
}
