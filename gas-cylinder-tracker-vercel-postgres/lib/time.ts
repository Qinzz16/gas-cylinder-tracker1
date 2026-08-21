export function formatDuration(totalSeconds?: number | null) {
  if (totalSeconds == null || totalSeconds < 0) return "—";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return [days && `${days}d`, (hours || days) && `${hours}h`, `${minutes}m`].filter(Boolean).join(" ");
}

export function liveDuration(from: Date, to = new Date()) {
  return formatDuration(Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000)));
}

export function displayDate(value?: Date | null) {
  return value ? new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIME_ZONE ?? "Asia/Kuala_Lumpur",
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(value) : "—";
}

export function dateTimeLocal(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIME_ZONE ?? "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(value).reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
