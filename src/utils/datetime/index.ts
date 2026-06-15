import type { Nullish } from "@/types";

const DEFAULT_FORMAT = "dd.MM.yyyy HH:mm:ss";
const DEFAULT_TIMEZONE = "default";

/**
 * Configuration options for formatting the date and time.
 */
export type Options = {
  /**
   * If `true`, formats the date as a relative time (e.g., "in 2 hours").
   * @default false
   */
  isRelative?: boolean;

  /**
   * The locale to use for relative time formatting (e.g., "en-US", "de-DE").
   * Defaults to the browser's current language setting.
   */
  locale?: string;

  /**
   * The format string to use for absolute time.
   * Supported tokens: `yyyy` (year), `MM` (month), `dd` (day), `HH` (hour 24h), `mm` (minute), `ss` (second).
   * @default "dd.MM.yyyy HH:mm:ss"
   */
  format?: string;
};

export class DateTime {
  /**
   * Formats a date value into a human-readable string, supporting both absolute
   * (`dd.MM.yyyy HH:mm:ss`) and relative time formats, with timezone awareness.
   *
   * @param value The date to format, which can be a `Date` object, an ISO 8601 string, or null/undefined.
   * @param options Optional configuration for formatting.
   * @returns The formatted date string, or `null` if the input value is nullish.
   */
  public static toFormatedDateTime(value: Nullish<Date | string>, options?: Options): null | string {
    if (!value) return null;

    const dateObj = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(dateObj.getTime())) return null;

    const locale = options?.locale || (typeof navigator !== "undefined" ? navigator.language : "en-US");

    if (options?.isRelative) {
      return DateTime.getRelativeTime(dateObj, locale);
    }

    let timezone: string | undefined;

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const storedTz = localStorage.getItem("timezone");
        if (storedTz && storedTz !== DEFAULT_TIMEZONE) {
          timezone = storedTz;
        }
      } catch {
        // ...
      }
    }

    const formatString = options?.format ?? DEFAULT_FORMAT;
    return DateTime.getAbsoluteTime(dateObj, formatString, timezone);
  }

  private static getRelativeTime(date: Date, locale: string): string {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const diffMs = date.getTime() - Date.now();

    const seconds = Math.round(diffMs / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const months = Math.round(days / 30);
    const years = Math.round(days / 365);

    if (Math.abs(years) > 0) return rtf.format(years, "year");
    if (Math.abs(months) > 0) return rtf.format(months, "month");
    if (Math.abs(days) > 0) return rtf.format(days, "day");
    if (Math.abs(hours) > 0) return rtf.format(hours, "hour");
    if (Math.abs(minutes) > 0) return rtf.format(minutes, "minute");

    return rtf.format(seconds, "second");
  }

  private static getAbsoluteTime(date: Date, format: string, timeZone?: string): string {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });

      const parts = formatter.formatToParts(date);
      const map: Record<string, string> = {};

      for (const part of parts) {
        if (part.type !== "literal") {
          map[part.type] = part.value;
        }
      }

      return format
        .replace("yyyy", map.year || "0000")
        .replace("MM", map.month || "00")
        .replace("dd", map.day || "00")
        .replace("HH", map.hour || "00")
        .replace("mm", map.minute || "00")
        .replace("ss", map.second || "00");
    } catch {
      if (timeZone) {
        return DateTime.getAbsoluteTime(date, format);
      }

      return date.toISOString();
    }
  }
}
