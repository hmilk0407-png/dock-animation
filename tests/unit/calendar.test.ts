import { describe, expect, it } from "vitest";
import {
  buildMorningText,
  dateLabelJa,
  eventsHash,
  formatEventsJa,
  sanitizeEvents,
  timeJst,
  todayJst,
} from "@/lib/calendar";

/* 朝の予定読み上げ (lib/calendar) の純粋関数テスト */
describe("calendar helpers", () => {
  it("todayJst は日本時間の日付を返す", () => {
    // 2026-09-08 23:30 UTC = 2026-09-09 08:30 JST
    expect(todayJst(new Date("2026-09-08T23:30:00Z"))).toBe("2026-09-09");
  });

  it("dateLabelJa は月日と曜日を返す", () => {
    expect(dateLabelJa("2026-09-08")).toBe("9月8日（火）");
  });

  it("timeJst は HH:MM (JST) を返す", () => {
    expect(timeJst("2026-09-08T00:30:00Z")).toBe("09:30");
  });

  it("sanitizeEvents は不正要素を捨て、終日→時刻順に並べる", () => {
    const events = sanitizeEvents([
      { title: "会議", start: "2026-09-08T04:00:00Z", end: "2026-09-08T05:00:00Z", allDay: false },
      { title: "出張", start: "2026-09-07T15:00:00Z", end: "2026-09-08T15:00:00Z", allDay: true },
      { title: "壊れた", start: "not-a-date" },
      "junk",
      { title: "朝礼", start: "2026-09-08T00:00:00Z", end: "2026-09-08T00:15:00Z", allDay: false, location: "本社" },
    ]);
    expect(events.map((e) => e.title)).toEqual(["出張", "朝礼", "会議"]);
    expect(events[1].location).toBe("本社");
  });

  it("formatEventsJa / buildMorningText は読める文面を作る", () => {
    const events = sanitizeEvents([
      { title: "朝礼", start: "2026-09-08T00:00:00Z", end: "2026-09-08T00:15:00Z", allDay: false, location: "本社" },
      { title: "出張", start: "2026-09-07T15:00:00Z", end: "2026-09-08T15:00:00Z", allDay: true },
    ]);
    expect(formatEventsJa(events)).toBe("・終日　出張\n・09:00〜09:15　朝礼（本社）");
    const text = buildMorningText({ day: "2026-09-08", events, greeting: "いい一日を！" });
    expect(text).toContain("今日（9月8日（火））のご予定は2件です");
    expect(text.endsWith("いい一日を！")).toBe(true);
    expect(buildMorningText({ day: "2026-09-08", events: [] })).toContain("ご予定はありません");
  });

  it("eventsHash は内容が同じなら同じ値", () => {
    const a = sanitizeEvents([{ title: "x", start: "2026-09-08T00:00:00Z", end: "2026-09-08T01:00:00Z" }]);
    const b = sanitizeEvents([{ title: "x", start: "2026-09-08T00:00:00Z", end: "2026-09-08T01:00:00Z" }]);
    expect(eventsHash(a)).toBe(eventsHash(b));
    expect(eventsHash(a)).not.toBe(eventsHash([]));
  });
});
