import { Card, CardContent } from '@packages/ui/components/card';
import {
  SettingsSection as Section,
  SettingsSectionContent,
  SettingsSectionDescription,
  SettingsSectionHeader,
  SettingsSectionTitle,
} from '@packages/ui/components/settings-section';
import { toast } from '@packages/ui/components/sonner';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { isApiError } from '@/shared/api/api-error';
import { ImageAltTextDialog } from '@/shared/components/image-alt-text-dialog';
import { ImageGalleryField } from '@/shared/components/image-gallery-field';
import { MAX_IMAGE_SIZE_MB } from '@/shared/lib/image-file';
import {
  useDeleteBusinessImage,
  useReorderBusinessImages,
  useUpdateBusinessImage,
  useUploadBusinessImage,
} from '../api/businesses.mutations';
import { businessQueries } from '../api/businesses.queries';
import { BusinessImageType, type BusinessImage } from '../types';

const MAX_IMAGES = 20;

type BusinessGalleryProps = {
  businessId: string;
};

export function BusinessGallery({ businessId }: BusinessGalleryProps) {
  const { data: images = [], isPending: isLoading } = useQuery(businessQueries.images(businessId));
  const uploadImage = useUploadBusinessImage(businessId);
  const reorderImages = useReorderBusinessImages(businessId);
  const deleteImage = useDeleteBusinessImage(businessId);
  const [editing, setEditing] = useState<BusinessImage | null>(null);
  const [altTextError, setAltTextError] = useState<string | null>(null);
  const updateImage = useUpdateBusinessImage(businessId, {
    onError: (error) => setAltTextError(isApiError(error) ? error.message : 'Não foi possível salvar a descrição.'),
  });
  const setCover = useUpdateBusinessImage(businessId);

  const closeAltText = () => {
    setEditing(null);
    setAltTextError(null);
  };

  return (
    <Section>
      <SettingsSectionHeader>
        <SettingsSectionTitle>Fotos do negócio</SettingsSectionTitle>
        <SettingsSectionDescription>
          Fachada, ambiente e trabalhos. Aparecem na sua página pública, e a capa fica em destaque.
        </SettingsSectionDescription>
      </SettingsSectionHeader>
      <SettingsSectionContent>
        <Card>
          <CardContent>
            <ImageGalleryField<BusinessImage>
              images={images}
              isLoading={isLoading}
              maxImages={MAX_IMAGES}
              description={`Toque na estrela para escolher a capa. JPEG, PNG, WebP, AVIF ou GIF de até ${MAX_IMAGE_SIZE_MB} MB.`}
              coverId={images.find(({ type }) => type === BusinessImageType.COVER)?.id ?? null}
              deletingId={deleteImage.isPending ? deleteImage.variables : null}
              onUpload={(file) => uploadImage.mutateAsync(file)}
              onReorder={(next) =>
                reorderImages.mutate(next, {
                  onError: () => toast.error('Não foi possível mudar a ordem das fotos. Tente novamente.'),
                })
              }
              onDelete={(image) => deleteImage.mutate(image.id, { onSuccess: () => toast.success('Foto excluída.') })}
              onEditAltText={setEditing}
              onSetCover={(image) =>
                setCover.mutate(
                  { imageId: image.id, body: { type: BusinessImageType.COVER } },
                  { onSuccess: () => toast.success('Capa atualizada.') },
                )
              }
            />
          </CardContent>
        </Card>
      </SettingsSectionContent>

      <ImageAltTextDialog
        image={editing}
        placeholder="Ex.: Fachada da barbearia"
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
    </Section>
  );
}
