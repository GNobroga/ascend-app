import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Spinner } from '@packages/ui/components/spinner';
import { toast } from '@packages/ui/components/sonner';
import { useQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { whatsappQueries } from '../api/whatsapp.queries';
import { WhatsAppConnected } from '../components/whatsapp-connected';
import { WhatsAppConnecting } from '../components/whatsapp-connecting';
import { WhatsAppConnectForm } from '../components/whatsapp-connect-form';
import { WhatsAppConnectionStatus } from '../types';

function WhatsAppSettingsPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <PageContainer>
      <PageHeader
        title="WhatsApp"
        description="Envie confirmações, lembretes e avisos de agendamento pelo número do negócio."
      />
      <WhatsAppSettings businessId={businessId} />
    </PageContainer>
  );
}

type WhatsAppSettingsProps = {
  businessId: string;
};

function WhatsAppSettings({ businessId }: WhatsAppSettingsProps) {
  const { data: connection, isPending, isError, refetch } = useQuery(whatsappQueries.connection(businessId));
  const status = connection?.status;
  const previousStatus = useRef(status);

  useEffect(() => {
    if (previousStatus.current === WhatsAppConnectionStatus.CONNECTING && status === WhatsAppConnectionStatus.CONNECTED) {
      toast.success('WhatsApp conectado. As mensagens já podem sair.');
    }
    previousStatus.current = status;
  }, [status]);

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground">
          <CircleAlertIcon className="size-5" />
          O serviço de WhatsApp não respondeu. Tente de novo em instantes.
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (connection?.status === WhatsAppConnectionStatus.CONNECTED) {
    return <WhatsAppConnected businessId={businessId} connection={connection} />;
  }

  if (connection?.status === WhatsAppConnectionStatus.CONNECTING) {
    return <WhatsAppConnecting businessId={businessId} connection={connection} />;
  }

  return <WhatsAppConnectForm businessId={businessId} connection={connection} />;
}

export { WhatsAppSettingsPage as Component };
