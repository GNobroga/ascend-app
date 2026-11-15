import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
import { Button } from '@packages/ui/components/button';
import { Skeleton } from '@packages/ui/components/skeleton';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { CircleAlertIcon, MailXIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { Link, useLocation, useNavigate } from 'react-router';
import { useLogout } from '@/features/auth';
import { businessPath } from '@/features/businesses';
import { userQueries, type User } from '@/features/users';
import { initialsOf } from '@/shared/lib/initials';
import { withRedirectTo } from '@/shared/lib/redirect-path';
import { useAcceptInvitation, useDeclineInvitation } from '../api/team.mutations';
import { teamQueries } from '../api/team.queries';
import { joinLabels, roleLabels } from '../roles';
import { acceptInvitationSearchParams } from '../search-params';
import type { InvitationPreview } from '../types';

function AcceptInvitationPage() {
  const [{ token }] = useQueryStates(acceptInvitationSearchParams);
  const preview = useQuery({ ...teamQueries.invitationPreview(token ?? ''), enabled: Boolean(token) });
  const me = useQuery(userQueries.me());

  if (token && (preview.isPending || me.isPending)) return <InvitationSkeleton />;

  if (!token || !preview.data) return <InvalidInvitation />;

  return <InvitationDetails token={token} invitation={preview.data} user={me.data ?? null} />;
}

function InvitationSkeleton() {
  return (
    <output aria-label="Carregando convite" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex w-full flex-col items-center gap-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </output>
  );
}

function InvalidInvitation() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <MailXIcon className="size-12 text-muted-foreground" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Convite indisponível</h1>
        <p className="text-sm text-muted-foreground">
          O link é inválido, expirou ou já foi usado. Peça a quem convidou você para reenviar o convite.
        </p>
      </div>
      <Button size="lg" className="w-full" nativeButton={false} render={<Link to="/" replace />}>
        Ir para o início
      </Button>
    </div>
  );
}

type InvitationDetailsProps = {
  token: string;
  invitation: InvitationPreview;
  user: User | null;
};

function InvitationDetails({ token, invitation, user }: InvitationDetailsProps) {
  const { pathname, search } = useLocation();
  const currentPath = pathname + search;
  const roles = joinLabels(roleLabels(invitation.roles)).toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Avatar className="size-16 text-lg">
          {invitation.businessLogoUrl && <AvatarImage src={invitation.businessLogoUrl} alt="" />}
          <AvatarFallback>{initialsOf(invitation.businessName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Entre para a equipe de {invitation.businessName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Você foi convidado como {roles}. O convite é para{' '}
            <span className="font-medium text-foreground">{invitation.email}</span>.
          </p>
        </div>
      </div>

      {!user && <SignInToAccept invitation={invitation} redirectTo={currentPath} />}
      {user && user.email.toLowerCase() !== invitation.email.toLowerCase() && (
        <WrongAccount invitation={invitation} user={user} redirectTo={currentPath} />
      )}
      {user && user.email.toLowerCase() === invitation.email.toLowerCase() && (
        <AnswerInvitation token={token} invitation={invitation} />
      )}
    </div>
  );
}

type SignInToAcceptProps = {
  invitation: InvitationPreview;
  redirectTo: string;
};

function SignInToAccept({ invitation, redirectTo }: SignInToAcceptProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-muted-foreground">Entre com esse e-mail para aceitar o convite.</p>
      <Button size="lg" nativeButton={false} render={<Link to={withRedirectTo('/login', redirectTo)} />}>
        Entrar
      </Button>
      <Button
        size="lg"
        variant="outline"
        nativeButton={false}
        render={<Link to={withRedirectTo('/register', redirectTo, { email: invitation.email })} />}
      >
        Criar conta
      </Button>
    </div>
  );
}

type WrongAccountProps = {
  invitation: InvitationPreview;
  user: User;
  redirectTo: string;
};

function WrongAccount({ invitation, user, redirectTo }: WrongAccountProps) {
  const logout = useLogout({ redirectTo });

  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <CircleAlertIcon />
        <AlertDescription>
          Você está conectado como {user.email}. Para aceitar, entre com {invitation.email}.
        </AlertDescription>
      </Alert>
      <Button type="button" size="lg" disabled={logout.isPending} onClick={() => logout.mutate()}>
        {logout.isPending && <Spinner />}
        Sair e entrar com outra conta
      </Button>
    </div>
  );
}

type AnswerInvitationProps = {
  token: string;
  invitation: InvitationPreview;
};

function AnswerInvitation({ token, invitation }: AnswerInvitationProps) {
  const navigate = useNavigate();
  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();
  const isPending = acceptInvitation.isPending || declineInvitation.isPending;

  const accept = () =>
    acceptInvitation.mutate(token, {
      onSuccess: (business) => {
        toast.success(`Bem-vindo à equipe de ${invitation.businessName}!`);
        void navigate(businessPath(business.id), { replace: true });
      },
    });

  const decline = () =>
    declineInvitation.mutate(token, {
      onSuccess: () => {
        toast.success('Convite recusado.');
        void navigate('/', { replace: true });
      },
    });

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" size="lg" disabled={isPending} onClick={accept}>
        {acceptInvitation.isPending && <Spinner />}
        Aceitar convite
      </Button>
      <Button type="button" size="lg" variant="ghost" disabled={isPending} onClick={decline}>
        {declineInvitation.isPending && <Spinner />}
        Recusar
      </Button>
    </div>
  );
}

export { AcceptInvitationPage as Component };
