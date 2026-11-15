import { TZDate } from '@date-fns/tz';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/components/card';
import { cn } from '@packages/ui/lib/utils';
import { MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from 'lucide-react';
import { DISPLAY_ORDER, FALLBACK_SOCIAL_ICON, socialNetworkConfig, WEEKDAY_LABELS } from '@/features/businesses';
import { formatStoredPhone } from '@/shared/lib/masks';
import { formatCityLine, formatStreet, mapsUrl, whatsappUrl } from '../format';
import type { PublicBusiness } from '../types';

type BusinessInfoProps = {
  business: PublicBusiness;
};

const linkClasses = 'flex items-start gap-2 text-sm hover:underline';

export function BusinessInfo({ business }: BusinessInfoProps) {
  const today = TZDate.tz(business.timezone).getDay();
  const hoursByDay = new Map(business.hours.map((hour) => [hour.dayOfWeek, hour]));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Contato e endereço</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <a href={mapsUrl(business.address)} target="_blank" rel="noreferrer" className={linkClasses}>
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              {formatStreet(business.address)}
              <br />
              <span className="text-muted-foreground">{formatCityLine(business.address)}</span>
            </span>
          </a>
          {business.phone && (
            <a href={`tel:${business.phone}`} className={linkClasses}>
              <PhoneIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {formatStoredPhone(business.phone)}
            </a>
          )}
          {business.phone && business.phoneIsWhatsApp && (
            <a href={whatsappUrl(business.phone)} target="_blank" rel="noreferrer" className={linkClasses}>
              <MessageCircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              Conversar no WhatsApp
            </a>
          )}
          <a href={`mailto:${business.email}`} className={cn(linkClasses, 'break-all')}>
            <MailIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {business.email}
          </a>
          {business.socialLinks.length > 0 && (
            <ul aria-label="Redes sociais" className="flex flex-wrap gap-2 border-t pt-3">
              {business.socialLinks.map(({ network, url }) => {
                const config = socialNetworkConfig(network);
                const Icon = config?.icon ?? FALLBACK_SOCIAL_ICON;
                return (
                  <li key={network}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${config?.label ?? 'Link'} de ${business.name}`}
                      title={config?.label}
                      className="flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      <Icon className="size-4" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {business.hours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Horário de funcionamento</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-1.5 text-sm">
              {DISPLAY_ORDER.map((day) => {
                const hour = hoursByDay.get(day);
                const isOpen = hour && !hour.isClosed && hour.openTime && hour.closeTime;
                return (
                  <div
                    key={day}
                    className={cn('flex justify-between gap-4', day === today ? 'font-medium' : 'text-muted-foreground')}
                  >
                    <dt>
                      {WEEKDAY_LABELS[day]}
                      {day === today && <span className="sr-only"> (hoje)</span>}
                    </dt>
                    <dd className="tabular-nums">{isOpen ? `${hour.openTime}–${hour.closeTime}` : 'Fechado'}</dd>
                  </div>
                );
              })}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
