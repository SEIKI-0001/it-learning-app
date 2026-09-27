/** Persist the user's calendar instead of relying on the server's timezone. */
const formatters = new Map<string, Intl.DateTimeFormat>();
export function validTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; } catch { return false; }
}
export function dateInZone(date: Date, timezone: string): string {
  let f = formatters.get(timezone);
  if (!f) { f = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year:'numeric',month:'2-digit',day:'2-digit'}); formatters.set(timezone,f); }
  const parts = f.formatToParts(date);
  return ['year','month','day'].map(k => parts.find(p=>p.type===k)!.value).join('-');
}
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);
}
export function startInZone(date: string, timezone: string): Date {
  const noon = Date.parse(`${date}T12:00:00Z`);
  let lo = noon-36*3600000, hi = noon+36*3600000;
  while (lo < hi) { const mid = Math.floor((lo+hi)/2); if (dateInZone(new Date(mid),timezone) < date) lo=mid+1; else hi=mid; }
  return new Date(lo);
}
