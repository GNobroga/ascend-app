import { toast } from '@packages/ui/components/sonner';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { isApiError } from '@/shared/api/api-error';
import { ImageAltTextDialog } from '@/shared/components/image-alt-text-dialog';
import { ImageGalleryField } from '@/shared/components/image-gallery-field';
import { MAX_IMAGE_SIZE_MB } from '@/shared/lib/image-file';
import { useDeleteImage, useReorderImages, useUpdateImage, useUploadImage } from '../api/catalog.mutations';
import { catalogQueries } from '../api/catalog.queries';
import type { CatalogImage, ImageOwner } from '../types';

const MAX_IMAGES = 10;

type CatalogImagesFieldProps = {
  businessId: string;
  owner: ImageOwner;
  scrollIntoView?: boolean;
};

export function CatalogImagesField({ businessId, owner, scrollIntoView = false }: CatalogImagesFieldProps) {
  const { data: images = [], isPending: isLoading } = useQuery(catalogQueries.images(businessId, owner));
  const uploadImage = useUploadImage(businessId, owner);
  const reorderImages = useReorderImages(businessId, owner);
  const deleteImage = useDeleteImage(businessId, owner);
  const [editing, setEditing] = useState<CatalogImage | null>(null);
  const [altTextError, setAltTextError] = useState<string | null>(null);
  const updateImage = useUpdateImage(businessId, owner, {
    onError: (error) => setAltTextError(isApiError(error) ? error.message : 'Não foi possível salvar a descrição.'),
  });

  const closeAltText = () => {
    setEditing(null);
    setAltTextError(null);
  };

  return (
    <>
      <ImageGalleryField<CatalogImage>
        images={images}
        isLoading={isLoading}
        maxImages={MAX_IMAGES}
        description={`A primeira foto é a capa. JPEG, PNG, WebP, AVIF ou GIF de até ${MAX_IMAGE_SIZE_MB} MB.`}
        coverId={images[0]?.id ?? null}
        deletingId={deleteImage.isPending ? deleteImage.variables : null}
        scrollIntoView={scrollIntoView}
        onUpload={(file) => uploadImage.mutateAsync(file)}
        onReorder={(next) =>
          reorderImages.mutate(next, {
            onError: () => toast.error('Não foi possível mudar a ordem das fotos. Tente novamente.'),
          })
        }
        onDelete={(image) => deleteImage.mutate(image.id, { onSuccess: () => toast.success('Foto excluída.') })}
        onEditAltText={setEditing}
      />

      <ImageAltTextDialog
        image={editing}
        placeholder="Ex.: Corte degradê com risco lateral"
        isPending={updateImage.isPending}
        serverError={altTextError}
        onSave={(altText) => {
          if (!editing) return;
          setAltTextError(null);
          updateImage.mutate(
            { imageId: editing.id, body: { altText } },
            {
              onSuccess: () => {
                toast.success('Descrição da foto salva.');
                closeAltText();
              },
            },
          );
        }}
        onOpenChange={(open) => !open && closeAltText()}
      />
    </>
  );
}
