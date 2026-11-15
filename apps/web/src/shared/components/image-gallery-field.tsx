import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { FieldDescription, FieldLegend, FieldSet } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { CaptionsIcon, ChevronLeftIcon, ChevronRightIcon, ImagePlusIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { lazy, Suspense, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ACCEPTED_IMAGE_TYPES, imageFileError } from '@/shared/lib/image-file';

const ImageViewer = lazy(() =>
  import('@packages/ui/components/image-viewer').then((module) => ({ default: module.ImageViewer })),
);

export type GalleryImage = {
  id: string;
  url: string;
  altText: string | null;
};

const moveImage = <T,>(images: T[], from: number, to: number) => {
  const next = [...images];
  const [moved] = next.splice(from, 1);
  if (moved) next.splice(to, 0, moved);
  return next;
};

type ImageGalleryFieldProps<T extends GalleryImage> = {
  images: T[];
  isLoading: boolean;
  maxImages: number;
  description: ReactNode;
  coverId: string | null;
  deletingId: string | null;
  scrollIntoView?: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onReorder: (images: T[]) => void;
  onDelete: (image: T) => void;
  onEditAltText: (image: T) => void;
  onSetCover?: (image: T) => void;
};

export function ImageGalleryField<T extends GalleryImage>({
  images,
  isLoading,
  maxImages,
  description,
  coverId,
  deletingId,
  scrollIntoView = false,
  onUpload,
  onReorder,
  onDelete,
  onEditAltText,
  onSetCover,
}: ImageGalleryFieldProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const remainingSlots = maxImages - images.length - uploadingCount;

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    const valid = files.filter((file) => {
      const error = imageFileError(file);
      if (error) toast.error(error);
      return error === null;
    });

    if (valid.length > remainingSlots) {
      toast.error(`Você pode adicionar só mais ${remainingSlots} ${remainingSlots === 1 ? 'foto' : 'fotos'}.`);
    }
    const toUpload = valid.slice(0, Math.max(remainingSlots, 0));
    if (toUpload.length === 0) return;

    setUploadingCount((count) => count + toUpload.length);
    for (const file of toUpload) {
      try {
        await onUpload(file).catch(() => undefined);
      } finally {
        setUploadingCount((count) => count - 1);
      }
    }
  };

  return (
    <FieldSet
      ref={(node) => {
        if (node && scrollIntoView) node.scrollIntoView({ block: 'start' });
      }}
    >
      <FieldLegend variant="label" className="flex w-full items-center justify-between">
        Fotos
        <span className="font-normal text-muted-foreground tabular-nums">
          {images.length}/{maxImages}
        </span>
      </FieldLegend>
      <FieldDescription>{description}</FieldDescription>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <li key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted">
              <button
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                className="block size-full cursor-zoom-in outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() => setViewerIndex(index)}
              >
                <img src={image.url} alt={image.altText ?? ''} className="size-full object-cover" />
              </button>
              {image.id === coverId && <Badge className="absolute top-1.5 left-1.5">Capa</Badge>}
              {onSetCover && image.id !== coverId && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label="Usar como capa"
                  className="absolute top-1.5 left-1.5"
                  onClick={() => onSetCover(image)}
                >
                  <StarIcon />
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label={image.altText ? `Editar descrição da foto: ${image.altText}` : 'Adicionar descrição da foto'}
                className="absolute top-1.5 right-1.5"
                onClick={() => onEditAltText(image)}
              >
                <CaptionsIcon />
              </Button>
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    aria-label="Mover foto para a esquerda"
                    disabled={index === 0}
                    onClick={() => onReorder(moveImage(images, index, index - 1))}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    aria-label="Mover foto para a direita"
                    disabled={index === images.length - 1}
                    onClick={() => onReorder(moveImage(images, index, index + 1))}
                  >
                    <ChevronRightIcon />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="destructive-solid"
                  size="icon-sm"
                  aria-label="Excluir foto"
                  disabled={deletingId === image.id}
                  onClick={() => onDelete(image)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </li>
          ))}

          {Array.from({ length: uploadingCount }, (_, index) => (
            <li
              key={`uploading-${index}`}
              className="flex aspect-square items-center justify-center rounded-xl border bg-muted"
              aria-label="Enviando foto"
            >
              <Spinner />
            </li>
          ))}

          {remainingSlots > 0 && (
            <li>
              <button
                type="button"
                className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlusIcon className="size-5" />
                Adicionar
              </button>
            </li>
          )}
        </ul>
      )}

      {viewerIndex !== null && images.length > 0 && (
        <Suspense fallback={null}>
          <ImageViewer
            open
            index={Math.min(viewerIndex, images.length - 1)}
            images={images.map(({ url, altText }) => ({ src: url, alt: altText ?? '' }))}
            onClose={() => setViewerIndex(null)}
          />
        </Suspense>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        hidden
        onChange={(event) => void handleFiles(event)}
      />
    </FieldSet>
  );
}
