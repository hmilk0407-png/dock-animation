/* ============================================================
   calendar — 今日の予定 (Google カレンダー → Apps Script → ingest)
   純粋関数のみ。サーバー・クライアント・テストから共用する。
   ============================================================ */

export type CalendarEvent = {
  title: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  allDay: boolean;
  location: string;
};

export const TZ = "Asia/Tokyo";
const MAX_EVENTS = 50;
const MAX_TEXT = 200;

/** 日本時間の今日 'YYYY-MM-DD' */
export function todayJst(now: Date = new Date()): string {
  // sv-SE ロケールは YYYY-MM-DD 形式を返す
  return now.toLocaleDateString("sv-SE", { timeZone: TZ });
}

/** 'YYYY-MM-DD' → '9月8日（火）' */
export function dateLabelJa(day: string): string {
  const d = new Date(`${day}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return day;
  const weekday = new Intl.DateTimeFormat("ja-JP", { timeZone: TZ, weekday: "short" })
    .format(d)
    .replace(/[()（）]/g, "");
  const m = Number(day.slice(5, 7));
  const dd = Number(day.slice(8, 10));
  return `${m}月${dd}日（${weekday}）`;
}

/** ISO → 'HH:MM' (日本時間) */
export function timeJst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(/^24:/, "00:");
}

/** 外部入力 (Apps Script の payload) を検証・整形する。不正な要素は捨てる */
export function sanitizeEvents(raw: unknown): CalendarEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: CalendarEvent[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const r = e as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim().slice(0, MAX_TEXT) : "";
    const start = typeof r.start === "string" ? r.start : "";
    const end = typeof r.end === "string" ? r.end : "";
    if (!start || Number.isNaN(new Date(start).getTime())) continue;
    out.push({
      title: title || "（無題）",
      start,
      end: end && !Number.isNaN(new Date(end).getTime()) ? end : start,
      allDay: r.allDay === true,
      location: typeof r.location === "string" ? r.location.trim().slice(0, MAX_TEXT) : "",
    });
    if (out.length >= MAX_EVENTS) break;
  }
  // 終日 → 開始時刻順
  out.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return a.start.localeCompare(b.start);
  });
  return out;
}

/** 予定一覧を箇条書きテキストにする (LLM を使わない確定部分) */
export function formatEventsJa(events: CalendarEvent[]): string {
  return events
    .map((e) => {
      const when = e.allDay ? "終日" : `${timeJst(e.start)}〜${timeJst(e.end)}`;
      const where = e.location ? `（${e.location}）` : "";
      return `・${when}　${e.title}${where}`;
    })
    .join("\n");
}

/** events の内容ハッシュ (greeting キャッシュの鍵)。djb2 */
export function eventsHash(events: CalendarEvent[]): string {
  const s = JSON.stringify(events);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

/** ミルクの朝のメッセージ本文を組み立てる */
export function buildMorningText({
  day,
  events,
  greeting,
}: {
  day: string;
  events: CalendarEvent[];
  greeting?: string | null;
}): string {
  const label = dateLabelJa(day);
  const head =
    events.length === 0
      ? `おはようございます。今日（${label}）のご予定はありません。`
      : `おはようございます。今日（${label}）のご予定は${events.length}件です。`;
  const parts = [head];
  if (events.length > 0) parts.push(formatEventsJa(events));
  if (greeting && greeting.trim()) parts.push(greeting.trim());
  return parts.join("\n\n");
}

/** LLM に渡す「予定の要約」 (回答APIの system にも使う) */
export function eventsForPrompt(day: string, events: CalendarEvent[]): string {
  if (events.length === 0) return `【今日 ${dateLabelJa(day)} の予定】なし`;
  return `【今日 ${dateLabelJa(day)} の予定 (Google カレンダー)】\n${formatEventsJa(events)}`;
}
