// Turn "9:15 in America/Chicago on 2026-10-13" into the exact UTC moment, including daylight saving.
// No library: Intl knows every zone's offset for any date.

/** Minutes the zone is ahead of UTC at a given instant (negative for the Americas). */
export function offsetMinutes(timeZone, at) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** The UTC Date at which the wall clock in `timeZone` reads `date` (YYYY-MM-DD) `time` (HH:MM). */
export function localToUtc(date, time, timeZone) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes: the offset can differ between the naive guess and the true instant around a DST change.
  let guess = new Date(naive - offsetMinutes(timeZone, new Date(naive)) * 60000);
  guess = new Date(naive - offsetMinutes(timeZone, guess) * 60000);
  return guess;
}

/**
 * Spread a day's sends through each recipient's morning: the first person in each zone at `start`,
 * the next `gapMinutes` later, and so on. Never two sends at the same minute (bursts look automated).
 */
export function morningSlots(people, { date, start = "09:00", gapMinutes = 15 }) {
  const used = new Map();
  return people.map((p) => {
    const k = used.get(p.tz) ?? 0;
    used.set(p.tz, k + 1);
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + k * gapMinutes;
    const local = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    return { ...p, local, sendAt: localToUtc(date, local, p.tz) };
  });
}

/** Weekdays only: cold email on a weekend gets fewer replies. */
export const isWeekday = (date) => { const d = new Date(`${date}T12:00:00Z`).getUTCDay(); return d >= 1 && d <= 5; };
