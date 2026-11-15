import { Alert, AlertDescription, AlertTitle } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@packages/ui/components/card';
import { Checkbox } from '@packages/ui/components/checkbox';
import { Field, FieldLabel } from '@packages/ui/components/field';
import { Spinner } from '@packages/ui/components/spinner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BellRingIcon, CalendarCheckIcon, CalendarXIcon, CircleCheckIcon, TriangleAlertIcon, UnplugIcon } from 'lucide-react';
import { useState } from 'react';
import { useConnectWhatsApp } from '../api/whatsapp.mutations';
import type { WhatsAppConnection } from '../types';

const MESSAGES = [
  { icon: CalendarCheckIcon, label: 'Confirmação do agendamento e remarcações' },
  { icon: BellRingIcon, label: 'Lembrete antes do horário' },
  { icon: CalendarXIcon, label: 'Aviso de cancelamento' },
  { icon: CircleCheckIcon, label: 'Convite para avaliar depois do atendimento' },
];

type WhatsAppConnectFormProps = {
  businessId: string;
  connection: WhatsAppConnection | null | undefined;
};

export function WhatsAppConnectForm({ businessId, connection }: WhatsAppConnectFormProps) {
  const isReconnect = Boolean(connection);
  const [acceptedTerms, setAcceptedTerms] = useState(isReconnect);
  const connect = useConnectWhatsApp(businessId);

  return (
    <div className="flex flex-col gap-6">
      {connection?.disconnectedAt && (
        <Alert>
          <UnplugIcon />
          <AlertTitle>WhatsApp desconectado</AlertTitle>
          <AlertDescription>
            O número deixou de enviar mensagens em{' '}
            {format(new Date(connection.disconnectedAt), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}. Conecte de
            novo para voltar a avisar os clientes.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isReconnect ? 'Reconectar o WhatsApp' : 'Conectar o WhatsApp do negócio'}</CardTitle>
          <CardDescription>
            Os clientes recebem as mensagens no WhatsApp, enviadas pelo número que você conectar. Quem pediu para não
            receber continua sem receber.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ul className="flex flex-col gap-2.5">
            {MESSAGES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm">
                <Icon className="size-4 shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>

          {!isReconnect && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertTitle>Integração não oficial</AlertTitle>
              <AlertDescription>
                A conexão usa o WhatsApp Web, não a API oficial do WhatsApp. O número pode ser bloqueado pelo WhatsApp,
                principalmente se for novo ou enviar muitas mensagens. Prefira um número exclusivo do negócio.
              </AlertDescription>
            </Alert>
          )}

          {!isReconnect && (
            <Field orientation="horizontal">
              <Checkbox
                id="whatsapp-accept-terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked)}
              />
              <FieldLabel htmlFor="whatsapp-accept-terms" className="font-normal">
                Estou ciente de que a integração não é oficial e de que o número pode ser bloqueado pelo WhatsApp.
              </FieldLabel>
            </Field>
          )}
        </CardContent>
        <CardFooter>
          <Button type="button" disabled={!acceptedTerms || connect.isPending} onClick={() => connect.mutate()}>
            {connect.isPending && <Spinner />}
            {isReconnect ? 'Reconectar' : 'Conectar WhatsApp'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
