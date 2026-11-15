import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatStoredPhone, onlyDigits } from '@/shared/lib/masks';
import type { UpdateCustomerRequest } from './api/customers.api';
import type { CustomerValues } from './schemas';
import { CustomerBlockType, type Customer, type CustomerBlock } from './types';

export const toCustomerFormValues = (customer?: Customer): CustomerValues => ({
  name: customer?.name ?? '',
  phone: customer?.phone ? formatStoredPhone(customer.phone) : '',
  email: customer?.email ?? '',
  notes: customer?.notes ?? '',
  whatsappOptOut: Boolean(customer?.whatsappOptedOutAt),
});

export const toCustomerRequest = (values: CustomerValues, allowDuplicate: boolean): UpdateCustomerRequest => ({
  name: values.name,
  phone: values.phone ? onlyDigits(values.phone) : null,
  email: values.email ? values.email.toLowerCase() : null,
  notes: values.notes || null,
  whatsappOptOut: values.whatsappOptOut,
  allowDuplicate,
});

const formatDate = (date: string, timeZone?: string) =>
  format(new TZDate(date, timeZone), "d 'de' MMM 'de' yyyy", { locale: ptBR });

export const formatCustomerSince = (customer: Customer) => formatDate(customer.createdAt);

export const describeBlock = (block: CustomerBlock, timeZone: string) =>
  block.type === CustomerBlockType.TEMPORARY && block.until
    ? `Bloqueado para agendar online até ${formatDate(block.until, timeZone)}.`
    : `Bloqueado para agendar online até pagar a taxa de ${formatCurrency(block.feeAmount ?? 0)}.`;

export const noShowLabel = (count: number) => (count === 1 ? '1 falta' : `${count} faltas`);

export const endOfDayIso = (date: string, timeZone: string) => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new TZDate(year, month - 1, day, 23, 59, timeZone).toISOString();
};
