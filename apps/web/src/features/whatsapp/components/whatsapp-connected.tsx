import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@packages/ui/components/alert-dialog';
import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/components/card';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Switch } from '@packages/ui/components/switch';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CircleCheckIcon, PauseIcon, UnplugIcon } from 'lucide-react';
import { useState } from 'react';
import { formatStoredPhone } from '@/shared/lib/masks';
import { useDisconnectWhatsApp, useSetWhatsAppEnabled } from '../api/whatsapp.mutations';
import type { WhatsAppConnection } from '../types';

type WhatsAppConnectedProps = {
  businessId: string;
  connection: WhatsAppConnection;
};

export function WhatsAppConnected({ businessId, connection }: WhatsAppConnectedProps) {
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);
  const setEnabled = useSetWhatsAppEnabled(businessId);
  const disconnect = useDisconnectWhatsApp(businessId);
  const enabled = setEnabled.isPending ? setEnabled.variables : connection.enabled;

  const toggleEnabled = (next: boolean) =>
    setEnabled.mutate(next, {
      onSuccess: () => toast.success(next ? 'Envio de mensagens retomado.' : 'Envio de mensagens pausado.'),
    });

  const confirmDisconnect = () =>
    disconnect.mutate(undefined, {
      onSuccess: () => {
        toast.success('WhatsApp desconectado.');
        setIsConfirmingDisconnect(false);
      },
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {connection.phoneNumber ? formatStoredPhone(connection.phoneNumber) : 'WhatsApp do negócio'}
          {enabled ? (
            <Badge>
              <CircleCheckIcon />
              Conectado
            </Badge>
          ) : (
            <Badge variant="secondary">
              <PauseIcon />
              Envio pausado
            </Badge>
          )}
        </CardTitle>
        {connection.connectedAt && (
          <CardDescription>
            Conectado desde {format(new Date(connection.connectedAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="whatsapp-enabled">Enviar mensagens aos clientes</FieldLabel>
            <FieldDescription>
              Pausado, nenhuma mensagem sai, mas o número continua conectado para retomar quando quiser.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="whatsapp-enabled"
            checked={enabled}
            disabled={setEnabled.isPending}
            onCheckedChange={toggleEnabled}
          />
        </Field>

        <div className="flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Desconectar encerra a sessão no celular. Para voltar a enviar, é preciso escanear o QR code de novo.
          </p>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setIsConfirmingDisconnect(true)}
          >
            <UnplugIcon />
            Desconectar
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={isConfirmingDisconnect} onOpenChange={setIsConfirmingDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar o WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Os clientes deixam de receber confirmações e lembretes até você conectar de novo. Se só quer parar por um
              tempo, pause o envio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnect.isPending}>Voltar</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={disconnect.isPending} onClick={confirmDisconnect}>
              {disconnect.isPending && <Spinner />}
              Desconectar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
