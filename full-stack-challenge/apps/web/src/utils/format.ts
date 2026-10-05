const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** An ISO timestamp in the viewer's locale and time zone. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** "1 monitoring point", "3 monitoring points". */
export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

const numberFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 3,
});

/** A reading value: grouped, at most 3 decimals. */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

const DAY_MS = 86_400_000;
const timeOnly = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const dateAndTime = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/**
 * A formatter for time-axis ticks, as precise as the visible span needs:
 * hours within a day, date and hour within a week, the date beyond.
 */
export function axisTimeFormatter(spanMs: number): (epochMs: number) => string {
  const format =
    spanMs <= DAY_MS ? timeOnly : spanMs <= 7 * DAY_MS ? dateAndTime : dateOnly;
  return (epochMs) => format.format(new Date(epochMs));
}
