import { Alert, AlertDescription, AlertTitle } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { MailWarningIcon } from 'lucide-react';
import { userQueries } from '@/features/users';
import { hasErrorCode, isApiError } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { useResendEmailVerification } from '../api/auth.mutations';

type EmailNotVerifiedAlertProps = {
  description: string;
};

export function EmailNotVerifiedAlert({ description }: EmailNotVerifiedAlertProps) {
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

  return (
    <Alert>
      <MailWarningIcon />
      <AlertTitle>Confirme seu e-mail</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <p>
          {description} Enviamos um link para <span className="font-medium text-foreground">{user.email}</span>.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={resend.isPending || resend.isSuccess}
          onClick={() =>
            resend.mutate(undefined, { onSuccess: () => toast.success(`Enviamos um novo link para ${user.email}.`) })
          }
        >
          {resend.isPending && <Spinner />}
          {resend.isSuccess ? 'Link enviado' : 'Reenviar link'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
