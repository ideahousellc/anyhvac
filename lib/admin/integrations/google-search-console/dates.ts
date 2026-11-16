export const GOOGLE_SEARCH_DAYS = 28;
export const GOOGLE_SEARCH_FINALIZATION_LAG_DAYS = 3;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getGoogleSearchDateWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const pacificToday = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  const endDate = new Date(pacificToday);
  endDate.setUTCDate(endDate.getUTCDate() - GOOGLE_SEARCH_FINALIZATION_LAG_DAYS);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (GOOGLE_SEARCH_DAYS - 1));
  return { startDate: isoDate(startDate), endDate: isoDate(endDate) };
}

export function getGoogleSearchReportWindows(now = new Date()) {
  const context = getGoogleSearchDateWindow(now);
  const offset = (days: number) => {
    const date = new Date(`${context.endDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return isoDate(date);
  };
  return {
    context,
    current: { startDate: offset(-6), endDate: context.endDate },
    previous: { startDate: offset(-13), endDate: offset(-7) },
    contextWeeks: [3, 2, 1, 0].map((week) => ({
      startDate: offset(-week * 7 - 6), endDate: offset(-week * 7),
    })),
  };
}
