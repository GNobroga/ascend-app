import {
  CalendarCogIcon,
  CalendarDaysIcon,
  ClockIcon,
  ContactIcon,
  FolderIcon,
  HouseIcon,
  LayoutListIcon,
  MessageCircleIcon,
  PackageIcon,
  ScissorsIcon,
  SettingsIcon,
  StarIcon,
  StoreIcon,
  UserRoundIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import { BusinessMemberRole } from '@/features/businesses';

export type NavigationLink = {
  label: string;
  icon: LucideIcon;
  path: string;
};

export type NavigationItem = NavigationLink & {
  end?: boolean;
  roles?: BusinessMemberRole[];
  children?: NavigationLink[];
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const MANAGERS: BusinessMemberRole[] = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];

export const NAVIGATION: NavigationGroup[] = [
  {
    label: 'Geral',
    items: [
      { label: 'Início', icon: HouseIcon, path: '', end: true },
      { label: 'Agenda', icon: CalendarDaysIcon, path: 'appointments' },
      { label: 'Clientes', icon: UsersRoundIcon, path: 'customers' },
      { label: 'Avaliações', icon: StarIcon, path: 'reviews' },
    ],
  },
  {
    label: 'Negócio',
    items: [
      {
        label: 'Catálogo',
        icon: LayoutListIcon,
        path: 'catalog',
        children: [
          { label: 'Serviços', icon: ScissorsIcon, path: 'services' },
          { label: 'Pacotes', icon: PackageIcon, path: 'packages' },
          { label: 'Categorias', icon: FolderIcon, path: 'categories' },
        ],
      },
      {
        label: 'Equipe',
        icon: UsersIcon,
        path: '',
        roles: MANAGERS,
        children: [
          { label: 'Profissionais', icon: UserRoundIcon, path: 'professionals' },
          { label: 'Membros', icon: ContactIcon, path: 'team' },
        ],
      },
      {
        label: 'Configurações',
        icon: SettingsIcon,
        path: 'settings',
        roles: MANAGERS,
        children: [
          { label: 'Dados do negócio', icon: StoreIcon, path: 'business' },
          { label: 'Horário de funcionamento', icon: ClockIcon, path: 'hours' },
          { label: 'Agendamento', icon: CalendarCogIcon, path: 'booking' },
          { label: 'Pagamento', icon: WalletIcon, path: 'payments' },
          { label: 'WhatsApp', icon: MessageCircleIcon, path: 'whatsapp' },
        ],
      },
    ],
  },
];
