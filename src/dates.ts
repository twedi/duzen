const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const WEEKDAYS_MON_FIRST = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** a - b, gün olarak (saatten bağımsız) */
export function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

/** "24 EKİM CUMARTESİ" */
export function headerDate(d: Date = new Date()): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${DAYS[d.getDay()]}`.toLocaleUpperCase('tr-TR');
}

/** "24 Eki" */
export function shortDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Cumartesi, 24 Ekim 2026" */
export function longDate(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Ekim 2026" */
export function monthTitle(y: number, m: number): string {
  return `${MONTHS[m]} ${y}`;
}

/** "17:00" */
export function timeText(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Bugün", "Yarın", "Dün", "Perşembe" (bu hafta içi) ya da "24 Eki" */
export function relativeDay(d: Date, now: Date = new Date()): string {
  const diff = diffDays(d, now);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Yarın';
  if (diff === -1) return 'Dün';
  if (diff > 1 && diff < 7) return DAYS[d.getDay()];
  return d.getFullYear() === now.getFullYear() ? shortDate(d) : `${shortDate(d)} ${d.getFullYear()}`;
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'later' | 'done';

/** Kartlarda gösterilecek tarih etiketi ve rengi */
export function dueInfo(iso: string, hasTime: boolean, done: boolean, now: Date = new Date()): { label: string; tone: DueTone } {
  const d = new Date(iso);
  const diff = diffDays(d, now);
  let label = relativeDay(d, now) + (hasTime ? ` · ${timeText(d)}` : '');
  if (done) return { label, tone: 'done' };
  const overdue = hasTime ? d.getTime() < now.getTime() : diff < 0;
  if (overdue) {
    if (diff <= -2) label = `${shortDate(d)} · ${-diff} gün gecikti`;
    return { label, tone: 'overdue' };
  }
  if (diff === 0) return { label, tone: 'today' };
  if (diff <= 7) return { label, tone: 'soon' };
  return { label, tone: 'later' };
}

/** "HH:MM" -> {h, m} */
export function parseHm(s: string): { h: number; m: number } {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return { h: isNaN(h) ? 9 : h, m: isNaN(m) ? 0 : m };
}

export function formatHm(h: number, m: number): string {
  return `${pad(h)}:${pad(m)}`;
}

/** Yerel tarih anahtarı: "2026-10-24" */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(s: string): Date | null {
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Takvim için 6 hafta x 7 gün, pazartesiden başlar */
export function monthGrid(y: number, m: number): Date[] {
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Kart formundaki hızlı tarih seçenekleri */
export function quickDates(now: Date = new Date()): { key: string; label: string; date: Date }[] {
  const today = startOfDay(now);
  const dow = today.getDay();
  const toSaturday = (6 - dow + 7) % 7;
  const toMonday = (1 - dow + 7) % 7 || 7;
  return [
    { key: 'today', label: 'Bugün', date: today },
    { key: 'tomorrow', label: 'Yarın', date: addDays(today, 1) },
    { key: 'weekend', label: 'Hafta sonu', date: addDays(today, toSaturday) },
    { key: 'nextweek', label: 'Gelecek hafta', date: addDays(today, toMonday) },
  ];
}

/** Tekrar eden görevin bir sonraki tarihi */
export function addRepeat(d: Date, repeat: string): Date {
  const x = new Date(d);
  if (repeat === 'daily') x.setDate(x.getDate() + 1);
  else if (repeat === 'weekly') x.setDate(x.getDate() + 7);
  else if (repeat === 'monthly') {
    const day = x.getDate();
    x.setDate(1);
    x.setMonth(x.getMonth() + 1);
    const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(day, last));
  }
  return x;
}

/** "7 Eki – 11 Eki" (yıl farklıysa yıl da yazılır) */
export function rangeText(s: Date, e: Date, now: Date = new Date()): string {
  const fmt = (d: Date) => (d.getFullYear() === now.getFullYear() ? shortDate(d) : `${shortDate(d)} ${d.getFullYear()}`);
  return `${fmt(s)} – ${fmt(e)}`;
}

/** Başlangıç ve bitiş dahil gün sayısı */
export function spanDays(s: Date, e: Date): number {
  return diffDays(e, s) + 1;
}

/** Tarih aralıklı görevler için etiket; aralık yoksa dueInfo ile aynı */
export function dueInfoRange(
  startIso: string | null,
  dueIso: string,
  hasTime: boolean,
  done: boolean,
  now: Date = new Date()
): { label: string; tone: DueTone } {
  const e = new Date(dueIso);
  if (!startIso) return dueInfo(dueIso, hasTime, done, now);
  const s = new Date(startIso);
  if (isSameDay(s, e)) return dueInfo(dueIso, hasTime, done, now);
  const base = rangeText(s, e, now);
  if (done) return { label: base, tone: 'done' };
  const toEnd = diffDays(e, now);
  const toStart = diffDays(s, now);
  if (toEnd < 0) return { label: `${base} · ${-toEnd} gün gecikti`, tone: 'overdue' };
  if (toStart <= 0) return { label: `${base} · ${toEnd === 0 ? 'bugün bitiyor' : `${toEnd} gün kaldı`}`, tone: 'today' };
  return { label: base, tone: toStart <= 7 ? 'soon' : 'later' };
}

/** Kart formundaki hızlı aralık seçenekleri */
export function quickRanges(now: Date = new Date()): { key: string; label: string; start: Date; end: Date }[] {
  const today = startOfDay(now);
  const dow = today.getDay();
  const toSunday = (7 - dow) % 7;
  const toMonday = (1 - dow + 7) % 7 || 7;
  const nextMon = addDays(today, toMonday);
  return [
    { key: 'week', label: 'Bu hafta', start: today, end: addDays(today, toSunday) },
    { key: 'nextweek', label: 'Gelecek hafta', start: nextMon, end: addDays(nextMon, 6) },
    { key: '3d', label: '3 gün', start: today, end: addDays(today, 2) },
    { key: '7d', label: '7 gün', start: today, end: addDays(today, 6) },
  ];
}
