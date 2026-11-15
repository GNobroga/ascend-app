import { Transform } from 'class-transformer';

export const BooleanQuery = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value));
