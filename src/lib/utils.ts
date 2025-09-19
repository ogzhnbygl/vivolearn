import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
