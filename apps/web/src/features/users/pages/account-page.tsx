import { Card, CardContent } from '@packages/ui/components/card';
import { FieldGroup } from '@packages/ui/components/field';
import {
  SettingsSection,
  SettingsSectionContent,
  SettingsSectionDescription,
  SettingsSectionHeader,
  SettingsSectionTitle,
} from '@packages/ui/components/settings-section';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ChangePasswordForm, EmailVerificationStatus } from '@/features/auth';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { userQueries } from '../api/users.queries';
import { ProfileForm } from '../components/profile-form';

function AccountPage() {
  const { data: user } = useSuspenseQuery(userQueries.me());

  return (
    <PageContainer size="narrow">
      <PageHeader title="Minha conta" description="Seu perfil, e-mail e senha de acesso." />
      <div className="flex flex-col gap-8">
        <AccountSection title="Perfil" description="Como você aparece para a equipe e os clientes.">
          <ProfileForm />
        </AccountSection>

        <AccountSection title="E-mail" description="O endereço que você usa para entrar.">
          <FieldGroup>
            <EmailVerificationStatus />
          </FieldGroup>
        </AccountSection>

        <AccountSection
          title="Senha"
          description={user.hasPassword ? 'Troque a senha usada para entrar.' : 'Crie uma senha para entrar sem o Google.'}
        >
          <ChangePasswordForm />
        </AccountSection>
      </div>
    </PageContainer>
  );
}

type AccountSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function AccountSection({ title, description, children }: AccountSectionProps) {
  return (
    <SettingsSection>
      <SettingsSectionHeader>
        <SettingsSectionTitle>{title}</SettingsSectionTitle>
        <SettingsSectionDescription>{description}</SettingsSectionDescription>
      </SettingsSectionHeader>
      <SettingsSectionContent>
        <Card>
          <CardContent>{children}</CardContent>
        </Card>
      </SettingsSectionContent>
    </SettingsSection>
  );
}

export { AccountPage as Component };
