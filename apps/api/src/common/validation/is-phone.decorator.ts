import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ValidateBy, type ValidationOptions } from 'class-validator';
import { E164_PATTERN, normalizePhone } from '../utilities/phone.js';

/** Normaliza para E.164 antes de validar; aceita máscara e número brasileiro sem DDI. */
export const IsPhone = (options?: ValidationOptions): PropertyDecorator =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? normalizePhone(value) : value)),
    ValidateBy(
      {
        name: 'isPhone',
        validator: {
          validate: (value: unknown) => typeof value === 'string' && E164_PATTERN.test(value),
          defaultMessage: () => '$property must be a valid phone number',
        },
      },
      options,
    ),
  );
