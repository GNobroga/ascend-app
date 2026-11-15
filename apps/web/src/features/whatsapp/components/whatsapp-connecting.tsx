import { Button } from '@packages/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/components/card';
import { Spinner } from '@packages/ui/components/spinner';
import { useDisconnectWhatsApp } from '../api/whatsapp.mutations';
import type { WhatsAppConnection } from '../types';

const STEPS = [
  'Abra o WhatsApp no celular do negócio.',
  'Toque em Mais opções (⋮) ou Configurações e entre em Aparelhos conectados.',
  'Toque em Conectar um aparelho.',
  'Aponte a câmera para o QR code ao lado.',
];

type WhatsAppConnectingProps = {
  businessId: string;
  connection: WhatsAppConnection;
};

export function WhatsAppConnecting({ businessId, connection }: WhatsAppConnectingProps) {
  const disconnect = useDisconnectWhatsApp(businessId);
  const qrImage = connection.qrCode?.base64;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escaneie o QR code</CardTitle>
        <CardDescription>O código muda a cada poucos segundos; esta tela atualiza sozinha.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col-reverse gap-6 md:flex-row md:items-center">
        <div className="flex flex-1 flex-col gap-5">
          <ol className="flex flex-col gap-3">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <output className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Aguardando a leitura do QR code…
          </output>
          <Button
            type="button"
            variant="ghost"
            className="self-start"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate()}
          >
            {disconnect.isPending && <Spinner />}
            Cancelar conexão
          </Button>
        </div>
        <div className="flex size-64 shrink-0 items-center justify-center self-center rounded-2xl border bg-white p-3">
          {qrImage ? (
            <img src={qrImage} alt="QR code para conectar o WhatsApp" className="size-full object-contain" />
          ) : (
            <Spinner className="text-muted-foreground" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
