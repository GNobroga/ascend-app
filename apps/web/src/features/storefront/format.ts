import type { BusinessAddress } from '@/features/businesses';
import { onlyDigits } from '@/shared/lib/masks';

export const formatStreet = ({ street, number, complement }: BusinessAddress) =>
  [`${street}, ${number}`, complement].filter(Boolean).join(' – ');

export const formatCityLine = ({ district, city, state }: BusinessAddress) => `${district}, ${city} – ${state}`;

export const mapsUrl = (address: BusinessAddress) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${formatStreet(address)}, ${formatCityLine(address)}, ${address.postalCode}`,
  )}`;

export const whatsappUrl = (phone: string) => `https://wa.me/${onlyDigits(phone)}`;

export const formatAverage = (average: number) => average.toLocaleString('pt-BR', { minimumFractionDigits: 1 });

export const pluralize = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;
