import type { IpoEvent } from '@/modules/ipo/types/ipo';

export type IpoEventStatus = 'upcoming' | 'active' | 'completed';

export function parseDateOnly(dateString?: string) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function getIpoOfferingStartDate(event: IpoEvent) {
  return parseDateOnly(event.offeringStartDate || event.offeringDate);
}

export function getIpoOfferingEndDate(event: IpoEvent) {
  return parseDateOnly(event.offeringEndDate || event.offeringDate);
}

export function getIpoEventStatus(event: IpoEvent, baseDate = new Date()): IpoEventStatus {
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);

  const offeringStartDate = getIpoOfferingStartDate(event);
  const offeringEndDate = getIpoOfferingEndDate(event);
  const ipoDate = parseDateOnly(event.ipoDate);

  if (offeringStartDate) offeringStartDate.setHours(0, 0, 0, 0);
  if (offeringEndDate) offeringEndDate.setHours(0, 0, 0, 0);
  if (!ipoDate) return 'upcoming';
  ipoDate.setHours(0, 0, 0, 0);

  if (today > ipoDate) return 'completed';
  if (offeringStartDate && today < offeringStartDate) return 'upcoming';
  if (offeringEndDate && today > offeringEndDate && today <= ipoDate) return 'active';
  return 'active';
}
