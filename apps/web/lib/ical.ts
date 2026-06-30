import { PRODUCT_NAME } from "@/lib/brand";

export interface IcalCard {
  id: string;
  title: string;
  due_date: string;
  board_name?: string;
}

function formatIcalDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function formatIcalDateTime(d: Date): string {
  return `${formatIcalDate(d)}T${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}${String(d.getUTCSeconds()).padStart(2, "0")}Z`;
}

export function buildIcsFeed(cards: IcalCard[], calendarName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${PRODUCT_NAME}//PT`,
    `X-WR-CALNAME:${escapeIcal(calendarName)}`,
    "CALSCALE:GREGORIAN",
  ];
  const now = formatIcalDateTime(new Date());
  for (const card of cards) {
    const due = new Date(card.due_date);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${card.id}@nextgen-planner`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatIcalDate(due)}`,
      `SUMMARY:${escapeIcal(card.title)}`,
      ...(card.board_name ? [`CATEGORIES:${escapeIcal(card.board_name)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeIcal(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
