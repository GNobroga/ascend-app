import { Button } from '@packages/ui/components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { SearchXIcon } from 'lucide-react';

type NoResultsProps = {
  title: string;
  onClearFilters: () => void;
};

export function NoResults({ title, onClearFilters }: NoResultsProps) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>Tente outra busca ou limpe os filtros.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" variant="outline" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      </EmptyContent>
    </Empty>
  );
}
