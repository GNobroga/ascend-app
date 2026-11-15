import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleCheckIcon, MailIcon, TriangleAlertIcon } from 'lucide-react';
import { userQueries } from '@/features/users';
import { hasErrorCode, isApiError } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { useResendEmailVerification } from '../api/auth.mutations';

export function EmailVerificationStatus() {
  const { data: user } = useSuspenseQuery(userQueries.me());
  const resend = useResendEmailVerification({
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.EMAIL_ALREADY_VERIFIED)) {
        toast.success('Seu e-mail já está verificado.');
        return;
      }
      toast.error(isApiError(error) ? error.message : 'Ocorreu um erro inesperado. Tente novamente.');
    },
  });
  const isVerified = user.emailVerifiedAt !== null;

  return (
    <Field>
      <FieldLabel>E-mail</FieldLabel>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm break-all">{user.email}</span>
        {isVerified ? (
          <Badge variant="secondary" className="gap-1">
            <CircleCheckIcon />
            Verificado
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-amber-700 dark:text-amber-400">
            <TriangleAlertIcon />
            Não verificado
          </Badge>
        )}
      </div>
      {isVerified ? (
        <FieldDescription>Usado para entrar e receber avisos. Não pode ser alterado.</FieldDescription>
      ) : (
        <>
          <FieldDescription>
            Confirme seu e-mail pelo link que enviamos. Ele é necessário para agendar online.
          </FieldDescription>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resend.isPending || resend.isSuccess}
              onClick={() =>
                resend.mutate(undefined, {
                  onSuccess: () => toast.success(`Enviamos um novo link para ${user.email}.`),
                })
              }
            >
              {resend.isPending ? <Spinner /> : <MailIcon />}
              {resend.isSuccess ? 'Link enviado' : 'Reenviar link de verificação'}
            </Button>
          </div>
        </>
      )}
    </Field>
  );
}
