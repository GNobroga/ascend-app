import { onlyDigits } from '@/shared/lib/masks';
import type { AddressRequest } from './api/businesses.api';
import type { AddressValues } from './schemas';

export const EMPTY_ADDRESS: AddressValues = {
  postalCode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
};

export const toAddressRequest = (address: AddressValues): AddressRequest => ({
  ...address,
  postalCode: onlyDigits(address.postalCode),
  complement: address.complement || null,
});
