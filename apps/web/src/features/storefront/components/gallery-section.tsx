import { BusinessImageType } from '@/features/businesses';
import type { PublicBusiness } from '../types';
import { StorefrontSection } from './storefront-section';

type GallerySectionProps = {
  business: PublicBusiness;
};

export function GallerySection({ business }: GallerySectionProps) {
  const cover = business.images.find(({ type }) => type === BusinessImageType.COVER) ?? business.images[0];
  const images = business.images.filter((image) => image.id !== cover?.id);
  if (images.length === 0) return null;

  return (
    <StorefrontSection id="photos" title="Fotos">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((image) => (
          <li key={image.id}>
            <a href={image.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl">
              <img
                src={image.url}
                alt={image.altText ?? ''}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform hover:scale-105"
              />
            </a>
          </li>
        ))}
      </ul>
    </StorefrontSection>
  );
}
