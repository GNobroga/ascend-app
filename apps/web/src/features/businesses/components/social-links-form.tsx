import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import {
  SettingsSection,
  SettingsSectionContent,
  SettingsSectionDescription,
  SettingsSectionHeader,
  SettingsSectionTitle,
} from '@packages/ui/components/settings-section';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useSetBusinessSocialLinks } from '../api/businesses.mutations';
import { businessQueries } from '../api/businesses.queries';
import { socialLinksSchema, type SocialLinksValues } from '../schemas';
import { SOCIAL_NETWORK_CONFIG, SOCIAL_NETWORKS, toSocialUrl, type SocialLink } from '../social-networks';

const LINK_URL_PATH = /^links\.(\d+)\.url$/;

const toFormValues = (links: SocialLink[]): SocialLinksValues => {
  const urls = new Map(links.map(({ network, url }) => [network, url]));
  return {
    instagram: urls.get('instagram') ?? '',
    facebook: urls.get('facebook') ?? '',
    tiktok: urls.get('tiktok') ?? '',
    youtube: urls.get('youtube') ?? '',
    x: urls.get('x') ?? '',
    linkedin: urls.get('linkedin') ?? '',
    website: urls.get('website') ?? '',
  };
};

const toLinks = (values: SocialLinksValues): SocialLink[] =>
  SOCIAL_NETWORKS.flatMap((network) => {
    const url = toSocialUrl(network, values[network]);
    return url ? [{ network, url }] : [];
  });

type SocialLinksFormProps = {
  businessId: string;
};

export function SocialLinksForm({ businessId }: SocialLinksFormProps) {
  const { data: links } = useSuspenseQuery(businessQueries.socialLinks(businessId));
  const form = useForm<SocialLinksValues>({
    resolver: zodResolver(socialLinksSchema),
    defaultValues: toFormValues(links),
  });
  const { errors, isDirty } = useFormState({ control: form.control });
  const setSocialLinks = useSetBusinessSocialLinks(businessId, {
    onError: (error, sent) => {
      if (!hasErrorCode(error, ErrorCode.VALIDATION_ERROR)) {
        applyApiErrors(form, error);
        return;
      }
      for (const { path, message } of error.details) {
        const network = sent[Number(LINK_URL_PATH.exec(path)?.[1])]?.network;
        if (network) form.setError(network, { message });
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setSocialLinks.mutate(toLinks(values), {
      onSuccess: (saved) => {
        form.reset(toFormValues(saved));
        toast.success('Redes sociais salvas.');
      },
    });
  });

  const serverError = errors.root?.server?.message;

  return (
    <SettingsSection>
      <SettingsSectionHeader>
        <SettingsSectionTitle>Redes sociais</SettingsSectionTitle>
        <SettingsSectionDescription>
          Aparecem na sua página pública. Use o @ do perfil ou cole o link.
        </SettingsSectionDescription>
      </SettingsSectionHeader>
      <SettingsSectionContent>
        <Card>
          <CardContent>
            <form noValidate onSubmit={onSubmit}>
              <FieldGroup>
                {serverError && (
                  <Alert variant="destructive">
                    <CircleAlertIcon />
                    <AlertDescription>{serverError}</AlertDescription>
                  </Alert>
                )}

                {SOCIAL_NETWORKS.map((network) => {
                  const { label, icon: Icon, placeholder } = SOCIAL_NETWORK_CONFIG[network];
                  const id = `social-${network}`;
                  return (
                    <Controller
                      key={network}
                      control={form.control}
                      name={network}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={id} className="gap-2">
                            <Icon className="size-4 text-muted-foreground" />
                            {label}
                          </FieldLabel>
                          <Input
                            {...field}
                            id={id}
                            type="text"
                            inputMode="url"
                            autoCapitalize="none"
                            spellCheck={false}
                            placeholder={placeholder}
                            aria-invalid={fieldState.invalid}
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  );
                })}

                <div className="flex flex-wrap justify-end gap-2">
                  {isDirty && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={setSocialLinks.isPending}
                      onClick={() => form.reset()}
                    >
                      Descartar
                    </Button>
                  )}
                  <Button type="submit" disabled={!isDirty || setSocialLinks.isPending}>
                    {setSocialLinks.isPending && <Spinner />}
                    Salvar redes sociais
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </SettingsSectionContent>
    </SettingsSection>
  );
}
