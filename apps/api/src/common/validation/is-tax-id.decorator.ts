import { ValidateBy, type ValidationOptions } from 'class-validator';
import { isValidTaxId } from '../utilities/tax-id.js';

export const IsTaxId = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'isTaxId',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isValidTaxId(value),
        defaultMessage: () => '$property must be a valid CPF or CNPJ',
      },
    },
    options,
  );
