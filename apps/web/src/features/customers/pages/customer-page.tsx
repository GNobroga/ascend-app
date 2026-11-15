import { Alert, AlertDescription, AlertTitle } from '@packages/ui/components/alert';
import { Avatar, AvatarFallback } from '@packages/ui/components/avatar';
import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { Separator } from '@packages/ui/components/separator';
import { toast } from '@packages/ui/components/sonner';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  BanIcon,
  CopyIcon,
  EllipsisIcon,
  MailIcon,
  MessageCircleIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CustomerAppointmentHistory, CustomerAppointmentSummary } from '@/features/appointments';
import { businessQueries, canManageBusiness, useBusinessTimezone } from '@/features/businesses';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { initialsOf } from '@/shared/lib/initials';
import { formatStoredPhone, onlyDigits } from '@/shared/lib/masks';
import { customerQueries } from '../api/customers.queries';
import { BlockCustomerDialog } from '../components/block-customer-dialog';
import { CustomerFormDialog } from '../components/customer-form-dialog';
import { RemoveCustomerDialog } from '../components/remove-customer-dialog';
import { UnblockCustomerDialog } from '../components/unblock-customer-dialog';
import { UnblockFeeDialog } from '../components/unblock-fee-dialog';
import { describeBlock, formatCustomerSince } from '../customers';
import { customersPath } from '../loaders';
import { CustomerBlockType, type Customer } from '../types';

function CustomerPage() {
  const { businessId, customerId } = useParams();
  if (!businessId || !customerId) return null;

  return <CustomerDetails key={customerId} businessId={businessId} customerId={customerId} />;
}

type CustomerDetailsProps = {
  businessId: string;
  customerId: string;
};

function CustomerDetails({ businessId, customerId }: CustomerDetailsProps) {
  const navigate = useNavigate();
  const { data: customer } = useSuspenseQuery(customerQueries.detail(businessId, customerId));
  const { data: businesses } = useSuspenseQuery(businessQueries.mine());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isFeeOpen, setIsFeeOpen] = useState(false);
  const [isUnblockOpen, setIsUnblockOpen] = useState(false);
  const timeZone = useBusinessTimezone(businessId);

  const canManage = canManageBusiness(businesses.find(({ id }) => id === businessId)?.roles ?? []);

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar size="lg" aria-hidden>
              <AvatarFallback>{initialsOf(customer.name)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate">{customer.name}</span>
              {customer.hasAccount && <Badge variant="secondary">Agenda online</Badge>}
              {customer.activeBlock && (
                <Badge variant="destructive">
                  <BanIcon />
                  Bloqueado
                </Badge>
              )}
            </span>
          </span>
        }
        description={`Cliente desde ${formatCustomerSince(customer)}.`}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(true)}>
              <PencilIcon />
              Editar
            </Button>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button type="button" variant="outline" size="icon" aria-label="Mais ações do cliente" />}
                >
                  <EllipsisIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  {!customer.activeBlock && (
                    <DropdownMenuItem onClick={() => setIsBlockOpen(true)}>
                      <BanIcon />
                      Bloquear
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => setIsRemoveOpen(true)}>
                    <Trash2Icon />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      {customer.activeBlock && (
        <Alert variant="destructive">
          <BanIcon />
          <AlertTitle>{describeBlock(customer.activeBlock, timeZone)}</AlertTitle>
          <AlertDescription>
            <span>{customer.activeBlock.reason ?? 'A equipe ainda pode agendar por ele normalmente.'}</span>
            <span className="mt-2 flex flex-wrap gap-2">
              {customer.activeBlock.type === CustomerBlockType.FEE && (
                <Button type="button" size="sm" onClick={() => setIsFeeOpen(true)}>
                  Registrar taxa paga
                </Button>
              )}
              {canManage && (
                <Button type="button" size="sm" variant="outline" onClick={() => setIsUnblockOpen(true)}>
                  Desbloquear
                </Button>
              )}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <section aria-label="Resumo do cliente" className="lg:col-start-2 lg:row-start-1">
          <CustomerAppointmentSummary businessId={businessId} customerId={customerId} timeZone={timeZone} />
        </section>

        <aside className="lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
          <CustomerProfile customer={customer} />
        </aside>

        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          <CustomerAppointmentHistory businessId={businessId} customerId={customerId} timeZone={timeZone} />
        </div>
      </div>

      <CustomerFormDialog
        businessId={businessId}
        customer={customer}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
      {canManage && (
        <BlockCustomerDialog
          businessId={businessId}
          timeZone={timeZone}
          customer={customer}
          open={isBlockOpen}
          onOpenChange={setIsBlockOpen}
        />
      )}
      {canManage && customer.activeBlock && (
        <UnblockCustomerDialog
          businessId={businessId}
          customer={customer}
          open={isUnblockOpen}
          onOpenChange={setIsUnblockOpen}
        />
      )}
      {customer.activeBlock?.type === CustomerBlockType.FEE && (
        <UnblockFeeDialog businessId={businessId} customer={customer} open={isFeeOpen} onOpenChange={setIsFeeOpen} />
      )}
      {canManage && (
        <RemoveCustomerDialog
          businessId={businessId}
          customer={customer}
          open={isRemoveOpen}
          onOpenChange={setIsRemoveOpen}
          onRemoved={() => void navigate(customersPath(businessId), { replace: true })}
        />
      )}
    </PageContainer>
  );
}

function CustomerProfile({ customer }: { customer: Customer }) {
  const canMessage = customer.phone !== null && !customer.whatsappOptedOutAt;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <ProfileSection title="Contato">
          {customer.phone ? (
            <ContactLine
              icon={<PhoneIcon />}
              href={`tel:${customer.phone}`}
              value={formatStoredPhone(customer.phone)}
              copyLabel="Telefone"
            />
          ) : (
            <MissingContact icon={<PhoneIcon />} label="Telefone não informado" />
          )}
          {customer.email ? (
            <ContactLine icon={<MailIcon />} href={`mailto:${customer.email}`} value={customer.email} copyLabel="E-mail" />
          ) : (
            <MissingContact icon={<MailIcon />} label="E-mail não informado" />
          )}
          {canMessage && customer.phone && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1 self-start"
              nativeButton={false}
              render={
                <a
                  href={`https://wa.me/${onlyDigits(customer.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Abrir conversa com ${customer.name} no WhatsApp`}
                />
              }
            >
              <MessageCircleIcon />
              Abrir WhatsApp
            </Button>
          )}
        </ProfileSection>

        <Separator />

        <ProfileSection title="Mensagens">
          <p>{customer.whatsappOptedOutAt ? 'Pediu para não receber WhatsApp' : 'Recebe lembretes e avisos no WhatsApp'}</p>
        </ProfileSection>

        <Separator />

        <ProfileSection title="Observações">
          {customer.notes ? (
            <p className="whitespace-pre-line">{customer.notes}</p>
          ) : (
            <p className="text-muted-foreground">Nenhuma observação.</p>
          )}
        </ProfileSection>
      </CardContent>
    </Card>
  );
}

type ProfileSectionProps = {
  title: string;
  children: ReactNode;
};

function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <section className="flex flex-col gap-2 text-sm">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

type ContactLineProps = {
  icon: ReactNode;
  href: string;
  value: string;
  copyLabel: string;
};

function ContactLine({ icon, href, value, copyLabel }: ContactLineProps) {
  const copy = () =>
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${copyLabel} copiado.`),
      () => toast.error(`Não foi possível copiar o ${copyLabel.toLowerCase()}.`),
    );

  return (
    <div className="flex items-center gap-2">
      <a
        href={href}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
      >
        {icon}
        <span className="truncate">{value}</span>
      </a>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={`Copiar ${copyLabel.toLowerCase()}`} onClick={() => void copy()}>
        <CopyIcon />
      </Button>
    </div>
  );
}

type MissingContactProps = {
  icon: ReactNode;
  label: string;
};

function MissingContact({ icon, label }: MissingContactProps) {
  return (
    <p className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
      {icon}
      {label}
    </p>
  );
}

export { CustomerPage as Component };
