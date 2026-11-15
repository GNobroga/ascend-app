import { Button } from '@packages/ui/components/button';
import { ListSkeleton } from '@packages/ui/components/skeletons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { UserPlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { BusinessMemberRole, businessQueries } from '@/features/businesses';
import { userQueries } from '@/features/users';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { InvitationsList } from '../components/invitations-list';
import { InviteMemberDialog } from '../components/invite-member-dialog';
import { MembersList } from '../components/members-list';

function TeamPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return <Team businessId={businessId} />;
}

type TeamProps = {
  businessId: string;
};

function Team({ businessId }: TeamProps) {
  const { data: user } = useSuspenseQuery(userQueries.me());
  const { data: businesses } = useSuspenseQuery(businessQueries.mine());
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const viewerRoles = businesses.find(({ id }) => id === businessId)?.roles ?? [];
  const canManageOwners = viewerRoles.includes(BusinessMemberRole.OWNER);

  return (
    <PageContainer>
      <PageHeader
        title="Equipe"
        description="Quem tem acesso ao negócio e o que cada pessoa pode fazer."
        actions={
          <Button type="button" onClick={() => setIsInviteOpen(true)}>
            <UserPlusIcon />
            Convidar
          </Button>
        }
      />

      <div className="flex flex-col gap-8">
        <QueryBoundary fallback={<ListSkeleton rows={3} />}>
          <MembersList businessId={businessId} viewerUserId={user.id} canManageOwners={canManageOwners} />
        </QueryBoundary>
        <QueryBoundary fallback={null}>
          <InvitationsList businessId={businessId} canManageOwners={canManageOwners} />
        </QueryBoundary>
      </div>

      <InviteMemberDialog
        businessId={businessId}
        canManageOwners={canManageOwners}
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
      />
    </PageContainer>
  );
}

export { TeamPage as Component };
