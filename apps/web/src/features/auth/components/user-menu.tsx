import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CalendarDaysIcon, ChevronDownIcon, CircleUserIcon, LogOutIcon } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { MY_APPOINTMENTS_PATH } from '@/features/my-appointments';
import { ACCOUNT_PATH, userQueries } from '@/features/users';
import { initialsOf } from '@/shared/lib/initials';
import { useLogout } from '../api/auth.mutations';

export function UserMenu() {
  const { data: user } = useSuspenseQuery(userQueries.me());
  const logout = useLogout();
  const { businessId } = useParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Conta de ${user.name}. Abrir menu da conta`}
            className="group flex h-9 shrink-0 items-center gap-2 rounded-full border bg-background py-1 pr-2.5 pl-1 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:bg-accent"
          />
        }
      >
        <Avatar className="size-7">
          {user.photoUrl && <AvatarImage src={user.photoUrl} alt="" />}
          <AvatarFallback className="text-xs font-medium">{initialsOf(user.name)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate sm:inline">{user.name.split(' ')[0]}</span>
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-popup-open:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to={businessId ? `/b/${businessId}/${ACCOUNT_PATH}` : `/${ACCOUNT_PATH}`} />}>
          <CircleUserIcon />
          Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to={MY_APPOINTMENTS_PATH} />}>
          <CalendarDaysIcon />
          Meus agendamentos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logout.isPending} onClick={() => logout.mutate()}>
          <LogOutIcon />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
