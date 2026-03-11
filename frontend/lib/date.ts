import { formatDistanceToNow as dateFnsFormatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDistanceToNow(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormatDistanceToNow(dateObj, { addSuffix: true, locale: zhCN });
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj.toLocaleString('zh-CN');
}
