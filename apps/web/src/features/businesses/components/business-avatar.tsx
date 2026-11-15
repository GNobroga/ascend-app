import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
import { cn } from '@packages/ui/lib/utils';
import { initialsOf } from '@/shared/lib/initials';
import type { MyBusiness } from '../types';

type BusinessAvatarProps = {
  business: Pick<MyBusiness, 'name' | 'logoUrl'>;
  className?: string;
};

export function BusinessAvatar({ business, className }: BusinessAvatarProps) {
  return (
    <Avatar className={cn('rounded-lg after:rounded-lg', className)}>
      {business.logoUrl && <AvatarImage src={business.logoUrl} alt="" className="rounded-lg" />}
      <AvatarFallback className="rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
        {initialsOf(business.name)}
      </AvatarFallback>
    </Avatar>
  );
}
