import { monthNames } from '@variable';

export const formatTimeDate = (mongoDBDateString?: string) => {
  if (!mongoDBDateString) return '';

  const date = new Date(mongoDBDateString);

  // Convert to Indian time zone
  const indiaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  const hours = indiaDate.getHours();
  const minutes = indiaDate.getMinutes();
  const day = indiaDate.getDate();
  const month = indiaDate.getMonth();
  const year = indiaDate.getFullYear().toString().slice(-2);

  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const AmPm = hours >= 12 ? 'PM' : 'AM';

  const formattedMonth = monthNames[month];

  return `${formattedHours}:${formattedMinutes}${AmPm} ${day} ${formattedMonth} ${year}`;
};
export const formatDate = (mongoDBDateString: string | Date) => {
  const date = new Date(mongoDBDateString);

  const day = date.getUTCDate();
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  const formattedMonth = monthNames[month];

  return `${day} ${formattedMonth} ${year}`;
};
export const calculateDeliveryDate = (mongoDBDateString: string | Date, daysToAdd?: number): string => {
  const date = new Date(mongoDBDateString);
  date.setUTCDate(date.getUTCDate() + (daysToAdd || 7));
  return formatDate(date);
};
export const NumberFormat = (product: number | string) => {
  const num = Number(product);

  if (isNaN(num)) return '0';
  if (num >= 1_000_00) {
    return `${(num / 1_00_000).toFixed(2).replace(/\.0$/, '')} L`;
  }
  if (num >= 1_0000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')} K`;
  }
  return new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(num);
};

export const IndNumberFormat = (product: number | string) => {
  const num = Number(product);

  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('en-IN', { style: 'decimal', maximumFractionDigits: 0 }).format(num);
};
