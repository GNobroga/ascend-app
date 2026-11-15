import { Avatar, AvatarFallback } from '@packages/ui/components/avatar';
import { Badge } from '@packages/ui/components/badge';
import { BanIcon, ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { initialsOf } from '@/shared/lib/initials';
import { formatStoredPhone } from '@/shared/lib/masks';
import { noShowLabel } from '../customers';
import type { Customer } from '../types';

type CustomerRowProps = {
  customer: Customer;
  to: string;
};

export function CustomerRow({ customer, to }: CustomerRowProps) {
  const contacts = [customer.phone && formatStoredPhone(customer.phone), customer.email].filter(Boolean).join(' · ');

  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent/50 focus-visible:bg-accent/50"
      >
        <Avatar size="lg">
          <AvatarFallback>{initialsOf(customer.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 font-medium">
            <span className="truncate">{customer.name}</span>
            {customer.activeBlock && (
              <Badge variant="destructive">
                <BanIcon />
                Bloqueado
              </Badge>
            )}
            {customer.noShowCount > 0 && <Badge variant="secondary">{noShowLabel(customer.noShowCount)}</Badge>}
          </span>
          <span className="truncate text-sm text-muted-foreground">{contacts || 'Sem contato'}</span>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
