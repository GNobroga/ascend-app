import { ImageIcon } from 'lucide-react';

type CatalogThumbnailProps = {
  imageUrl: string | null;
  name: string;
  onClick?: () => void;
};

const THUMBNAIL_CLASS =
  'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted text-muted-foreground';

export function CatalogThumbnail({ imageUrl, name, onClick }: CatalogThumbnailProps) {
  const content = imageUrl ? (
    <img src={imageUrl} alt="" loading="lazy" className="size-full object-cover" />
  ) : (
    <ImageIcon className="size-5" />
  );

  if (!onClick) return <div className={THUMBNAIL_CLASS}>{content}</div>;

  return (
    <button
      type="button"
      aria-label={imageUrl ? `Ver fotos de ${name}` : `Adicionar fotos a ${name}`}
      className={`${THUMBNAIL_CLASS} outline-none transition-shadow hover:ring-3 hover:ring-ring/20 focus-visible:ring-3 focus-visible:ring-ring/30`}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
