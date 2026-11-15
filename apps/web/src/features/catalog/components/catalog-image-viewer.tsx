import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { catalogQueries } from '../api/catalog.queries';
import type { ImageOwner } from '../types';

const ImageViewer = lazy(() =>
  import('@packages/ui/components/image-viewer').then((module) => ({ default: module.ImageViewer })),
);

type CatalogImageViewerProps = {
  businessId: string;
  owner: ImageOwner;
  index?: number;
  onClose: () => void;
};

export function CatalogImageViewer({ businessId, owner, index = 0, onClose }: CatalogImageViewerProps) {
  const { data: images } = useQuery(catalogQueries.images(businessId, owner));
  if (!images || images.length === 0) return null;

  return (
    <Suspense fallback={null}>
      <ImageViewer
        open
        index={Math.min(index, images.length - 1)}
        images={images.map(({ url, altText }) => ({ src: url, alt: altText ?? '' }))}
        onClose={onClose}
      />
    </Suspense>
  );
}
