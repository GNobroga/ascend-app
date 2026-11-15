import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class EvolutionWebhookDto {
    @ApiProperty({ example: 'connection.update' })
    @IsString()
    event: string;

    @ApiProperty({ description: 'Nome da instância no Evolution.', example: 'business-39356aed-64d0-40a3-b61c-e814f6381723' })
    @IsString()
    @IsNotEmpty()
    instance: string;

    @ApiProperty({ type: Object, description: 'Conteúdo do evento; em `connection.update`, traz `state` e `wuid`.', example: { state: 'open', wuid: '5511999990000@s.whatsapp.net' } })
    @IsObject()
    data: Record<string, unknown>;
}
