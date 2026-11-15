import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { toast } from '@packages/ui/components/sonner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EllipsisIcon, MailIcon, RotateCwIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { BusinessMemberRole } from '@/features/businesses';
import { useResendInvitation } from '../api/team.mutations';
import { teamQueries } from '../api/team.queries';
import { joinLabels, roleLabels } from '../roles';
import type { BusinessInvitation } from '../types';
import { RevokeInvitationDialog } from './revoke-invitation-dialog';

const formatExpiry = (expiresAt: string) => format(new Date(expiresAt), "d 'de' MMM 'às' HH:mm", { locale: ptBR });

type InvitationsListProps = {
  businessId: string;
  canManageOwners: boolean;
};

export function InvitationsList({ businessId, canManageOwners }: InvitationsListProps) {
  const { data: invitations } = useSuspenseQuery(teamQueries.invitations(businessId));
  const [revoking, setRevoking] = useState<BusinessInvitation | null>(null);
  const resendInvitation = useResendInvitation(businessId);

  if (invitations.length === 0) return null;

  const resend = (invitation: BusinessInvitation) =>
    resendInvitation.mutate(invitation.id, {
      onSuccess: () => toast.success('Convite reenviado.', { description: `Novo link enviado para ${invitation.email}.` }),
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">Convites pendentes</h2>
      <Card className="py-0">
        <CardContent className="px-0">
          <ul className="flex flex-col divide-y">
            {invitations.map((invitation) => (
              <InvitationItem
                key={invitation.id}
                invitation={invitation}
                canManage={canManageOwners || !invitation.roles.includes(BusinessMemberRole.OWNER)}
                isResending={resendInvitation.isPending && resendInvitation.variables === invitation.id}
                onResend={() => resend(invitation)}
                onRevoke={() => setRevoking(invitation)}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      <RevokeInvitationDialog
        businessId={businessId}
        invitation={revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
      />
    </section>
  );
}

type InvitationItemProps = {
  invitation: BusinessInvitation;
  canManage: boolean;
  isResending: boolean;
  onResend: () => void;
  onRevoke: () => void;
};

function InvitationItem({ invitation, canManage, isResending, onResend, onRevoke }: InvitationItemProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MailIcon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          <span className="truncate">{invitation.email}</span>
          {invitation.isExpired && <Badge variant="secondary">Expirado</Badge>}
        </span>
        <span className="text-sm text-muted-foreground">{joinLabels(roleLabels(invitation.roles))}</span>
        <span className="text-sm text-muted-foreground">
          {invitation.isExpired ? 'Reenvie para gerar um novo link' : `Expira em ${formatExpiry(invitation.expiresAt)}`}
          {invitation.invitedByName && ` · enviado por ${invitation.invitedByName}`}
        </span>
      </div>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isResending}
                aria-label={`Ações do convite para ${invitation.email}`}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={onResend}>
              <RotateCwIcon />
              Reenviar convite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onRevoke}>
              <XIcon />
              Cancelar convite
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
