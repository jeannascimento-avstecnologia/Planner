export type GoogleCalendarEventBody = {
  summary: string;
  start: { date: string };
  end: { date: string };
};

export function buildGoogleDeadlineEvent(title: string, dueDate: string): GoogleCalendarEventBody {
  const day = dueDate.slice(0, 10);
  return {
    summary: title,
    start: { date: day },
    end: { date: day },
  };
}

export function buildSlackAutomationPayload(message: string): { text: string } {
  return { text: message };
}
