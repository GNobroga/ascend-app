import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ChevronRightIcon, PlusIcon, TriangleAlertIcon, UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { BusinessMemberStatus } from '@/features/businesses';
import { formatPercent } from '@/shared/lib/format-percent';
import { professionalQueries } from '../api/professionals.queries';
import { professionalsPath } from '../loaders';
import type { Professional } from '../types';
import { AddProfessionalDialog } from './add-professional-dialog';
import { ProfessionalAvatar } from './professional-avatar';

const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

type ProfessionalsListProps = {
  businessId: string;
};

export function ProfessionalsList({ businessId }: ProfessionalsListProps) {
  const { data: professionals } = useSuspenseQuery(professionalQueries.list(businessId));
  const [isAddOpen, setIsAddOpen] = useState(false);

  const addButton = (
    <Button type="button" onClick={() => setIsAddOpen(true)}>
      <PlusIcon />
      Adicionar profissional
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {professionals.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum profissional</EmptyTitle>
            <EmptyDescription>
              Profissionais são quem atende os clientes. Se você também atende, adicione a si mesmo.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{addButton}</EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="flex justify-end">{addButton}</div>
          <Card>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {professionals.map((professional) => (
                  <ProfessionalRow
                    key={professional.id}
                    professional={professional}
                    to={`${professionalsPath(businessId)}/${professional.id}`}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      <AddProfessionalDialog businessId={businessId} open={isAddOpen} onOpenChange={setIsAddOpen} />
    </div>
  );
}

type ProfessionalRowProps = {
  professional: Professional;
  to: string;
};

function ProfessionalRow({ professional, to }: ProfessionalRowProps) {
  const isSuspended = professional.memberStatus === BusinessMemberStatus.SUSPENDED;
  const attendsNothing = professional.services.length === 0 && professional.packages.length === 0;

  return (
    <li className="py-1 first:pt-0 last:pb-0">
      <Link
        to={to}
        className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-2 outline-none hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <ProfessionalAvatar professional={professional} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 font-medium">
            <span className="truncate">{professional.displayName}</span>
            {isSuspended && <Badge variant="secondary">Suspenso</Badge>}
            {attendsNothing && (
              <Badge variant="outline">
                <TriangleAlertIcon />
                Sem serviços
              </Badge>
            )}
          </span>
          <span className="text-sm text-muted-foreground">
            {countLabel(professional.services.length, 'serviço', 'serviços')} ·{' '}
            {countLabel(professional.packages.length, 'pacote', 'pacotes')} · comissão de{' '}
            {formatPercent(professional.commissionPercent)}
          </span>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
