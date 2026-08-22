/**
 * Accepts only explicit ISO-8601 date-times whose precision can be represented
 * losslessly by JavaScript milliseconds. A timezone designator is mandatory.
 */
const OFFSET_ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|([+-])(\d{2}):(\d{2}))$/;

export function isStrictOffsetIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  const match = OFFSET_ISO_TIMESTAMP.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  if (
    month < 1 || month > 12
    || day < 1 || day > daysInMonth(year, month)
    || hour > 23
    || minute > 59
    || second > 59
    || offsetHour > 14
    || offsetMinute > 59
    || (offsetHour === 14 && offsetMinute !== 0)
  ) return false;

  return Number.isFinite(Date.parse(value));
}

export function isSameStrictIsoInstant(left: string, right: string): boolean {
  return isStrictOffsetIsoTimestamp(left)
    && isStrictOffsetIsoTimestamp(right)
    && Date.parse(left) === Date.parse(right);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
