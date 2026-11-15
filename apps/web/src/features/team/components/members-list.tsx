import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
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
import {
  CircleCheckIcon,
  CirclePauseIcon,
  EllipsisIcon,
  ShieldIcon,
  UserMinusIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  BusinessMemberRole,
  BusinessMemberStatus,
  businessQueries,
  type BusinessMember,
} from '@/features/businesses';
import { professionalsPath } from '@/features/professionals';
import { initialsOf } from '@/shared/lib/initials';
import { useUpdateMember } from '../api/team.mutations';
import { joinLabels, roleLabels } from '../roles';
import { MemberRolesDialog } from './member-roles-dialog';
import { RemoveMemberDialog } from './remove-member-dialog';

type MembersListProps = {
  businessId: string;
  viewerUserId: string;
  canManageOwners: boolean;
};

export function MembersList({ businessId, viewerUserId, canManageOwners }: MembersListProps) {
  const { data: members } = useSuspenseQuery(businessQueries.members(businessId));
  const [editingRoles, setEditingRoles] = useState<BusinessMember | null>(null);
  const [removing, setRemoving] = useState<BusinessMember | null>(null);
  const updateMember = useUpdateMember(businessId);

  const toggleSuspended = (member: BusinessMember) => {
    const isSuspended = member.status === BusinessMemberStatus.SUSPENDED;
    updateMember.mutate(
      {
        memberId: member.id,
        body: { status: isSuspended ? BusinessMemberStatus.ACTIVE : BusinessMemberStatus.SUSPENDED },
      },
      {
        onSuccess: () =>
          toast.success(isSuspended ? `Acesso de ${member.name} reativado.` : `Acesso de ${member.name} suspenso.`),
      },
    );
  };

  const canManage = (member: BusinessMember) =>
    member.userId !== viewerUserId && (canManageOwners || !member.roles.includes(BusinessMemberRole.OWNER));

  return (
    <>
      <Card className="py-0">
        <CardContent className="px-0">
          <ul className="flex flex-col divide-y">
            {members.map((member) => (
              <MemberItem
                key={member.id}
                businessId={businessId}
                member={member}
                isViewer={member.userId === viewerUserId}
                canManage={canManage(member)}
                isUpdating={updateMember.isPending && updateMember.variables.memberId === member.id}
                onEditRoles={() => setEditingRoles(member)}
                onToggleSuspended={() => toggleSuspended(member)}
                onRemove={() => setRemoving(member)}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      <MemberRolesDialog
        businessId={businessId}
        member={editingRoles}
        canManageOwners={canManageOwners}
        onOpenChange={(open) => !open && setEditingRoles(null)}
      />
      <RemoveMemberDialog
        businessId={businessId}
        member={removing}
        onOpenChange={(open) => !open && setRemoving(null)}
      />
    </>
  );
}

type MemberItemProps = {
  businessId: string;
  member: BusinessMember;
  isViewer: boolean;
  canManage: boolean;
  isUpdating: boolean;
  onEditRoles: () => void;
  onToggleSuspended: () => void;
  onRemove: () => void;
};

function MemberItem({
  businessId,
  member,
  isViewer,
  canManage,
  isUpdating,
  onEditRoles,
  onToggleSuspended,
  onRemove,
}: MemberItemProps) {
  const isSuspended = member.status === BusinessMemberStatus.SUSPENDED;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar size="lg">
        {member.photoUrl && <AvatarImage src={member.photoUrl} alt="" />}
        <AvatarFallback>{initialsOf(member.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          <span className="truncate">{member.name}</span>
          {isViewer && <Badge variant="outline">Você</Badge>}
          {isSuspended && <Badge variant="secondary">Suspenso</Badge>}
        </span>
        <span className="truncate text-sm text-muted-foreground">{member.email}</span>
        <span className="text-sm text-muted-foreground">{joinLabels(roleLabels(member.roles))}</span>
      </div>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isUpdating}
                aria-label={`Ações de ${member.name}`}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem onClick={onEditRoles}>
              <ShieldIcon />
              Alterar papéis
            </DropdownMenuItem>
            {member.professionalId && (
              <DropdownMenuItem
                render={<Link to={`${professionalsPath(businessId)}/${member.professionalId}`} />}
              >
                <UserRoundIcon />
                Ver perfil de profissional
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onToggleSuspended}>
              {isSuspended ? <CircleCheckIcon /> : <CirclePauseIcon />}
              {isSuspended ? 'Reativar acesso' : 'Suspender acesso'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onRemove}>
              <UserMinusIcon />
              Remover da equipe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
