import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(...inputs);
}

export function formatDateRange(start?: Date | string | null, end?: Date | string | null) {
  if (!start && !end) {
    return "Tarih bilgisi yakında";
  }

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;

  const fmt = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (startDate && endDate) {
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  }

  if (startDate) {
    return `${fmt.format(startDate)} itibarıyla`;
  }

  return `${fmt.format(endDate!)} tarihine kadar`;
}

export function normalizeGoogleDriveUrl(url: string): string {
  const trimmed = url.trim();

  const fileIdMatch =
    /https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/.exec(trimmed) ||
    /https?:\/\/drive\.google\.com\/open\?id=([^&]+)/.exec(trimmed) ||
    /https?:\/\/drive\.google\.com\/uc\?id=([^&]+)/.exec(trimmed);

  if (fileIdMatch?.[1]) {
    return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
  }

  return trimmed;
}
