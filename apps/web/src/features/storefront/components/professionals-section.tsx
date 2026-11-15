import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
import { Badge } from '@packages/ui/components/badge';
import { Card, CardContent } from '@packages/ui/components/card';
import { useQuery } from '@tanstack/react-query';
import { StarIcon } from 'lucide-react';
import { initialsOf } from '@/shared/lib/initials';
import { storefrontQueries } from '../api/storefront.queries';
import { formatAverage } from '../format';
import { StorefrontSection } from './storefront-section';

type ProfessionalsSectionProps = {
  slug: string;
};

export function ProfessionalsSection({ slug }: ProfessionalsSectionProps) {
  const { data: professionals = [] } = useQuery(storefrontQueries.professionals(slug));
  const { data: ratings } = useQuery(storefrontQueries.ratings(slug));
  if (professionals.length === 0) return null;

  const ratingOf = (professionalId: string) =>
    ratings?.professionals.find((rating) => rating.professionalId === professionalId);

  return (
    <StorefrontSection id="team" title="Equipe">
      <ul className="grid gap-3 sm:grid-cols-2">
        {professionals.map((professional) => {
          const rating = ratingOf(professional.id);
          return (
            <li key={professional.id}>
              <Card className="h-full">
                <CardContent className="flex gap-4">
                  <Avatar className="size-14 shrink-0">
                    {professional.photoUrl && <AvatarImage src={professional.photoUrl} alt="" />}
                    <AvatarFallback>{initialsOf(professional.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <h3 className="font-medium">{professional.displayName}</h3>
                      {rating?.average != null && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
                          <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
                          {formatAverage(rating.average)}
                          <span className="sr-only">de 5, em {rating.count} avaliações</span>
                        </span>
                      )}
                    </div>
                    {professional.bio && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{professional.bio}</p>
                    )}
                    {professional.specialties.length > 0 && (
                      <ul className="flex flex-wrap gap-1" aria-label="Especialidades">
                        {professional.specialties.map((specialty) => (
                          <li key={specialty}>
                            <Badge variant="secondary">{specialty}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </StorefrontSection>
  );
}
