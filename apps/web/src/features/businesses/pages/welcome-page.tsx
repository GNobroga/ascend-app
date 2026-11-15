import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
import { Card, CardContent } from '@packages/ui/components/card';
import { GlowBackdrop } from '@packages/ui/components/glow-backdrop';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { MY_APPOINTMENTS_PATH } from '@/features/my-appointments';
import { userQueries } from '@/features/users';
import { initialsOf } from '@/shared/lib/initials';
import { OnboardingShell } from '../components/onboarding-shell';
import { AgendaPreview, InvitePreview } from '../components/welcome-previews';
import { NEW_BUSINESS_PATH } from '../loaders';

const NEXT_STEPS = ['Crie seu negócio', 'Cadastre serviços e equipe', 'Compartilhe seu link e receba agendamentos'];

function WelcomePage() {
  const { data: user } = useSuspenseQuery(userQueries.me());
  const firstName = user.name.split(' ')[0];

  return (
    <OnboardingShell>
      <GlowBackdrop />

      <div className="flex w-full max-w-3xl flex-col gap-10 self-center py-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar size="lg" className="size-14 shadow-sm">
            {user.photoUrl && <AvatarImage src={user.photoUrl} alt="" />}
            <AvatarFallback className="text-base font-semibold">{initialsOf(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Boas-vindas, {firstName}!
            </h1>
            <p className="text-pretty text-muted-foreground">
              Vamos deixar tudo pronto para seus clientes agendarem com você.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            to={NEW_BUSINESS_PATH}
            className="group rounded-[min(var(--radius-4xl),24px)] outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <Card className="h-full transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-primary/40 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
              <CardContent className="flex h-full flex-col gap-5">
                <AgendaPreview />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">Criar meu negócio</h2>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cadastre sua barbearia, salão ou clínica e comece a receber agendamentos online.
                  </p>
                </div>
                <span className="flex items-center gap-1.5 self-end text-sm font-medium text-primary">
                  Começar
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="flex h-full flex-col gap-5">
              <div className="h-32">
                <InvitePreview email={user.email} />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <h2 className="font-semibold">Fui convidado</h2>
                <p className="text-sm text-muted-foreground">
                  Peça ao responsável pelo negócio para enviar o convite para{' '}
                  <span className="font-medium break-all text-foreground">{user.email}</span>. O link chega por
                  e-mail e precisa ser aberto com esta conta.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          {NEXT_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3 text-sm text-muted-foreground">
              {index > 0 && <span aria-hidden="true" className="hidden h-px w-6 bg-border sm:block" />}
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium text-foreground">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <p className="text-center text-sm text-muted-foreground">
          Só quer marcar um horário?{' '}
          <Link to={MY_APPOINTMENTS_PATH} className="font-medium text-foreground underline-offset-4 hover:underline">
            Ver meus agendamentos
          </Link>
        </p>
      </div>
    </OnboardingShell>
  );
}

export { WelcomePage as Component };
