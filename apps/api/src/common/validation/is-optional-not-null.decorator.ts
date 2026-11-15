import { ValidateIf } from 'class-validator';

/** Como `@IsOptional()`, mas só para `undefined`: `null` segue para a validação e é rejeitado. */
export const IsOptionalNotNull = (): PropertyDecorator => ValidateIf((_, value: unknown) => value !== undefined);
