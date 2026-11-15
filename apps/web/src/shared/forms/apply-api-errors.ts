import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { hasErrorCode, isApiError } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';

const UNEXPECTED_ERROR_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente.';

export const applyApiErrors = <T extends FieldValues>(form: UseFormReturn<T>, error: unknown) => {
  if (hasErrorCode(error, ErrorCode.VALIDATION_ERROR) && error.details.length > 0) {
    for (const { path, message } of error.details) {
      form.setError(path as Path<T>, { message });
    }
    return;
  }

  form.setError('root.server', { message: isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE });
};
