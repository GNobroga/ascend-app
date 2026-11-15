import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
import { initialsOf } from '@/shared/lib/initials';
import type { Professional } from '../types';

type ProfessionalAvatarProps = {
  professional: Pick<Professional, 'displayName' | 'photoUrl'>;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
};

export function ProfessionalAvatar({ professional, size, className }: ProfessionalAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {professional.photoUrl && <AvatarImage src={professional.photoUrl} alt="" />}
      <AvatarFallback>{initialsOf(professional.displayName)}</AvatarFallback>
    </Avatar>
  );
}
