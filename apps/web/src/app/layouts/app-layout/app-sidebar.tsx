import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarSubItem,
  SidebarSubmenu,
} from '@packages/ui/components/sidebar';
import { useSuspenseQuery } from '@tanstack/react-query';
import { matchPath, NavLink, useLocation } from 'react-router';
import ascendLogoDark from '@/assets/brand/ascend-logo-dark.webp';
import ascendLogo from '@/assets/brand/ascend-logo.webp';
import { BusinessSwitcher, businessPath, businessQueries, hasAnyRole, settingsPath } from '@/features/businesses';
import { professionalsPath } from '@/features/professionals';
import { TrialCard } from '@/features/subscriptions';
import { env } from '@/shared/env';
import { NAVIGATION } from './navigation';

type AppSidebarProps = {
  businessId: string;
};

export function AppSidebar({ businessId }: AppSidebarProps) {
  const { data: businesses } = useSuspenseQuery(businessQueries.mine());
  const roles = businesses.find(({ id }) => id === businessId)?.roles ?? [];
  const basePath = businessPath(businessId);
  const { pathname } = useLocation();

  const groups = NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || hasAnyRole(roles, item.roles)),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar>
      <SidebarHeader>
        <BusinessSwitcher businessId={businessId} />
      </SidebarHeader>
      <SidebarContent aria-label="Navegação principal">
        {groups.map((group) => (
          <SidebarGroup key={group.label} label={group.label}>
            {group.items.map(({ label, icon: Icon, path, end, children }) => {
              const itemPath = path ? `${basePath}/${path}` : basePath;

              if (children) {
                const links = children.map((child) => ({ ...child, to: `${itemPath}/${child.path}` }));

                return (
                  <SidebarSubmenu
                    key={label}
                    icon={<Icon />}
                    label={label}
                    isActive={links.some(({ to }) => matchPath({ path: to, end: false }, pathname) !== null)}
                  >
                    {links.map(({ label: childLabel, icon: ChildIcon, to }) => (
                      <SidebarSubItem
                        key={childLabel}
                        icon={<ChildIcon />}
                        label={childLabel}
                        render={<NavLink to={to} />}
                      />
                    ))}
                  </SidebarSubmenu>
                );
              }

              return (
                <SidebarItem key={label} icon={<Icon />} label={label} render={<NavLink to={itemPath} end={end} />} />
              );
            })}
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="group-data-[state=collapsed]/sidebar:hidden">
        <TrialCard
          businessId={businessId}
          stepLinks={{
            businessHours: settingsPath(businessId, 'hours'),
            services: `${basePath}/catalog/services`,
            professionals: professionalsPath(businessId),
          }}
        />
        <div className="flex items-center px-1 opacity-60">
          <img src={ascendLogo} alt={env.VITE_APP_NAME} className="h-4 w-auto dark:hidden" />
          <img src={ascendLogoDark} alt={env.VITE_APP_NAME} className="hidden h-4 w-auto dark:block" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
