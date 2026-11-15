import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsBoolean } from 'class-validator';
import { WhatsAppConnectionStatus } from '../../../common/enums/whatsapp-connection-status.enum.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { WhatsAppQrCode } from '../../../common/whatsapp/whatsapp-provider.js';
import type { BusinessWhatsAppConnectionEntity } from '../../../database/entities/business-whatsapp-connection.entity.js';

export class ConnectWhatsAppDto {
    @ApiProperty({
        enum: [true],
        description: 'Confirma que o negócio está ciente de que a integração não é oficial e o número pode ser bloqueado pelo WhatsApp.',
    })
    @Equals(true)
    acceptTerms: true;
}

export class UpdateWhatsAppConnectionDto {
    @ApiPropertyOptional({ description: 'Desligado, as mensagens deixam de sair sem desconectar o número.' })
    @IsOptionalNotNull()
    @IsBoolean()
    enabled?: boolean;
}

export class WhatsAppQrCodeDto {
    @ApiProperty({ description: 'Conteúdo do QR code, para gerar a imagem no cliente.', example: '2@x3K+mx9+6YfJNLKSYfT/DNHT...' })
    code: string;

    @ApiProperty({ type: String, nullable: true, description: 'Imagem PNG pronta, como data URL.', example: 'data:image/png;base64,iVBORw0KGgo...' })
    base64: string | null;

    static from(qrCode: WhatsAppQrCode): WhatsAppQrCodeDto {
        const dto = new WhatsAppQrCodeDto();
        dto.code = qrCode.code;
        dto.base64 = qrCode.base64;
        return dto;
    }
}

export class WhatsAppConnectionResponseDto {
    @ApiProperty({ enum: Object.values(WhatsAppConnectionStatus) })
    status: WhatsAppConnectionStatus;

    @ApiProperty({ type: String, nullable: true, description: 'Número conectado, em E.164.', example: '+5511999990000' })
    phoneNumber: string | null;

    @ApiProperty({ description: 'Se as mensagens estão sendo enviadas.' })
    enabled: boolean;

    @ApiProperty({ format: 'date-time' })
    termsAcceptedAt: Date;

    @ApiProperty({ type: Date, format: 'date-time', nullable: true })
    connectedAt: Date | null;

    @ApiProperty({ type: Date, format: 'date-time', nullable: true })
    disconnectedAt: Date | null;

    @ApiProperty({ type: WhatsAppQrCodeDto, nullable: true, description: 'Presente enquanto `status` é `connecting`; expira em poucos segundos.' })
    qrCode: WhatsAppQrCodeDto | null;

    static from(connection: BusinessWhatsAppConnectionEntity, qrCode: WhatsAppQrCode | null): WhatsAppConnectionResponseDto {
        const dto = new WhatsAppConnectionResponseDto();
        dto.status = connection.status;
        dto.phoneNumber = connection.phoneNumber;
        dto.enabled = connection.enabled;
        dto.termsAcceptedAt = connection.termsAcceptedAt;
        dto.connectedAt = connection.connectedAt;
        dto.disconnectedAt = connection.disconnectedAt;
        dto.qrCode = qrCode ? WhatsAppQrCodeDto.from(qrCode) : null;
        return dto;
    }
}
