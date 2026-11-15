import { TZDate } from '@date-fns/tz';
import type { Package } from '@/features/catalog';
import type { Professional } from '@/features/professionals';
import { timeToMinutes } from './calendar';

export type BookingSelection = { serviceIds: string[] } | { packageId: string };

export const isProfessionalApt = (professional: Professional, packages: Package[], selection: BookingSelection) => {
  if ('serviceIds' in selection) {
    return selection.serviceIds.every((id) => professional.services.some(({ serviceId }) => serviceId === id));
  }
  const links = packages.find(({ id }) => id === selection.packageId)?.professionals ?? [];
  return links.some((link) => link.professionalId === professional.id);
};

export const toStartAt = (date: string, time: string, timeZone: string) => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const minutes = timeToMinutes(time);
  return new TZDate(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, timeZone).toISOString();
};
