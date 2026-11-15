import { ThemeSwitch } from '@packages/ui/components/theme-switch';
import { CalendarCheckIcon, MessageCircleIcon, StarIcon, UsersIcon, WalletIcon } from 'lucide-react';
import { Outlet, redirect, type LoaderFunctionArgs } from 'react-router';
import ascendLogoDark from '@/assets/brand/ascend-logo-dark.webp';
import ascendLogo from '@/assets/brand/ascend-logo.webp';
import authBackground from '@/assets/images/auth-background.webp';
import { userQueries } from '@/features/users';
import { env } from '@/shared/env';
import { safeRedirectPath } from '@/shared/lib/redirect-path';
import { queryClient } from '../query-client';

const CURRENT_YEAR = new Date().getFullYear();

const HIGHLIGHTS = [
  { icon: CalendarCheckIcon, label: 'Agendamento online' },
  { icon: MessageCircleIcon, label: 'Lembretes por WhatsApp' },
  { icon: UsersIcon, label: 'Gestão da equipe' },
  { icon: StarIcon, label: 'Avaliações de clientes' },
  { icon: WalletIcon, label: 'Controle de pagamentos' },
];

export const authLayoutLoader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await queryClient.query(userQueries.me());
  } catch {
    return null;
  }

  throw redirect(safeRedirectPath(new URL(request.url).searchParams.get('redirectTo')));
};

export function AuthLayout() {
  return (
    <div className="grid min-h-svh bg-background lg:h-svh lg:grid-cols-2">
      <div className="relative hidden bg-neutral-950 lg:block">
        <img src={authBackground} alt="" className="absolute inset-0 size-full object-cover object-right" />
        <div className="absolute inset-0 bg-neutral-950/40" />
        <div className="absolute inset-x-0 top-0 h-2/3 bg-linear-to-b from-neutral-950/80 to-transparent" />
        <div className="relative flex max-w-lg flex-col gap-4 p-10 xl:p-14">
          <h2 className="text-4xl font-semibold tracking-tight text-balance text-white xl:text-5xl">
            Sua agenda no ritmo do seu crescimento.
          </h2>
          <p className="text-lg text-pretty text-white/70">
            Agendamento online, equipe, clientes e lembretes por WhatsApp em um só lugar, para você focar no
            que importa: atender bem.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/90 backdrop-blur-sm"
              >
                <Icon className="size-4 text-white/70" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 md:p-10 lg:overflow-y-auto">
        <header className="flex items-center justify-between">
          <img src={ascendLogo} alt={env.VITE_APP_NAME} className="h-8 w-auto dark:hidden" />
          <img src={ascendLogoDark} alt={env.VITE_APP_NAME} className="hidden h-8 w-auto dark:block" />
          <ThemeSwitch />
        </header>

        <main className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </main>

        <footer className="text-center text-xs text-muted-foreground">
          © {CURRENT_YEAR} {env.VITE_APP_NAME}. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  );
}
