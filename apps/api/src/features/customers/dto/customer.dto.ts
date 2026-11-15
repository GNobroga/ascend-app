import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { CustomerBlockType } from '../../../common/enums/customer-block-type.enum.js';
import { PaginationQueryDto } from '../../../common/http/pagination-query.dto.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import { IsPhone } from '../../../common/validation/is-phone.decorator.js';
import type { CustomerBlockEntity } from '../../../database/entities/customer-block.entity.js';
import type { CustomerEntity } from '../../../database/entities/customer.entity.js';
import type { PossibleDuplicateGroup } from '../customers.service.js';

export const MAX_BLOCK_DAYS = 365;
const REASON_MAX_LENGTH = 1000;

const PHONE_DESCRIPTION = 'Aceita máscara; sem DDI é tratado como brasileiro. Gravado em E.164.';
const ALLOW_DUPLICATE_DESCRIPTION = 'Grava mesmo que outro cliente tenha o mesmo telefone ou e-mail (ex.: telefone compartilhado).';

export class CreateCustomerDto {
    @ApiProperty({ maxLength: 255, example: 'Maria Souza' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ type: String, nullable: true, format: 'email', maxLength: 320, example: 'maria@email.com' })
    @IsOptional()
    @IsEmail()
    @MaxLength(320)
    email?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true, description: PHONE_DESCRIPTION, example: '(11) 99999-0000' })
    @IsOptional()
    @IsPhone()
    phone?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true, description: 'Observações internas; não aparecem para o cliente.', example: 'Prefere atendimento pela manhã.' })
    @IsOptional()
    @IsString()
    notes?: string | null;

    @ApiPropertyOptional({ description: ALLOW_DUPLICATE_DESCRIPTION, default: false })
    @IsOptionalNotNull()
    @IsBoolean()
    allowDuplicate?: boolean;
}

export class UpdateCustomerDto {
    @ApiPropertyOptional({ maxLength: 255, example: 'Maria Souza' })
    @IsOptionalNotNull()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ type: String, nullable: true, format: 'email', maxLength: 320, description: '`null` remove o e-mail.', example: 'maria@email.com' })
    @IsOptional()
    @IsEmail()
    @MaxLength(320)
    email?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true, description: `${PHONE_DESCRIPTION} \`null\` remove o telefone.`, example: '(11) 99999-0000' })
    @IsOptional()
    @IsPhone()
    phone?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true, description: '`null` remove as observações.', example: 'Prefere atendimento pela manhã.' })
    @IsOptional()
    @IsString()
    notes?: string | null;

    @ApiPropertyOptional({ description: '`true` para de enviar mensagens de WhatsApp a este cliente; `false` volta a enviar.' })
    @IsOptionalNotNull()
    @IsBoolean()
    whatsappOptOut?: boolean;

    @ApiPropertyOptional({ description: `${ALLOW_DUPLICATE_DESCRIPTION} Só é checado quando telefone ou e-mail mudam.`, default: false })
    @IsOptionalNotNull()
    @IsBoolean()
    allowDuplicate?: boolean;
}

export class CustomerListQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Busca por parte do nome, do e-mail ou do telefone.', maxLength: 100, example: 'maria' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;
}

export class BlockCustomerDto {
    @ApiProperty({ enum: Object.values(CustomerBlockType), description: '`temporary` vence em `until`; `fee` dura até a equipe registrar o pagamento da `unblockFee` do negócio.' })
    @IsIn(Object.values(CustomerBlockType))
    type: CustomerBlockType;

    @ApiPropertyOptional({ format: 'date-time', description: `Fim do bloqueio; obrigatório em \`temporary\`, no futuro e em até ${MAX_BLOCK_DAYS} dias. Ignorado em \`fee\`.`, example: '2026-11-30T03:00:00.000Z' })
    @ValidateIf((dto: BlockCustomerDto) => dto.type === CustomerBlockType.TEMPORARY)
    @Type(() => Date)
    @IsDate()
    until?: Date;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: REASON_MAX_LENGTH, description: 'Motivo; só a equipe vê.', example: 'Faltou 3 vezes sem avisar.' })
    @IsOptional()
    @IsString()
    @MaxLength(REASON_MAX_LENGTH)
    reason?: string | null;
}

export class PayUnblockFeeDto {
    @ApiProperty({ format: 'uuid', description: 'Forma de pagamento ativa do negócio.' })
    @IsUUID()
    paymentMethodId: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: REASON_MAX_LENGTH, example: 'Pago via Pix.' })
    @IsOptional()
    @IsString()
    @MaxLength(REASON_MAX_LENGTH)
    notes?: string | null;
}

export class CustomerBlockResponseDto {
    @ApiProperty({ enum: Object.values(CustomerBlockType) })
    type: CustomerBlockType;

    @ApiProperty({ type: String, nullable: true, example: 'Faltou 3 vezes sem avisar.' })
    reason: string | null;

    @ApiProperty({ type: Date, format: 'date-time', nullable: true, description: 'Fim do bloqueio `temporary`; `null` em `fee`.' })
    until: Date | null;

    @ApiProperty({ type: Number, nullable: true, description: 'Taxa para desbloquear, em reais; `null` em `temporary`.', example: 50 })
    feeAmount: number | null;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(block: CustomerBlockEntity): CustomerBlockResponseDto {
        const dto = new CustomerBlockResponseDto();
        dto.type = block.type;
        dto.reason = block.reason;
        dto.until = block.until;
        dto.feeAmount = block.feeAmount;
        dto.createdAt = block.createdAt;
        return dto;
    }
}

export class CustomerResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Maria Souza' })
    name: string;

    @ApiProperty({ type: String, nullable: true, format: 'email', example: 'maria@email.com' })
    email: string | null;

    @ApiProperty({ type: String, nullable: true, description: 'E.164.', example: '+5511999990000' })
    phone: string | null;

    @ApiProperty({ type: String, nullable: true, example: 'Prefere atendimento pela manhã.' })
    notes: string | null;

    @ApiProperty({ type: Date, format: 'date-time', nullable: true, description: 'Quando o cliente pediu para não receber WhatsApp; `null` recebe.' })
    whatsappOptedOutAt: Date | null;

    @ApiProperty({ description: 'Ligado a uma conta da plataforma (agenda online).' })
    hasAccount: boolean;

    @ApiProperty({ type: CustomerBlockResponseDto, nullable: true, description: 'Bloqueio vigente para agendar online; `null` quando livre.' })
    activeBlock: CustomerBlockResponseDto | null;

    @ApiProperty({ description: 'Quantos agendamentos do cliente foram marcados como `no_show`.', example: 2 })
    noShowCount: number;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(customer: CustomerEntity): CustomerResponseDto {
        const dto = new CustomerResponseDto();
        dto.id = customer.id;
        dto.name = customer.name;
        dto.email = customer.email;
        dto.phone = customer.phone;
        dto.notes = customer.notes;
        dto.whatsappOptedOutAt = customer.whatsappOptedOutAt;
        dto.hasAccount = !!customer.user;
        dto.activeBlock = customer.activeBlock ? CustomerBlockResponseDto.from(customer.activeBlock) : null;
        dto.noShowCount = customer.noShowCount ?? 0;
        dto.createdAt = customer.createdAt;
        return dto;
    }
}

export const DuplicateField = { EMAIL: 'email', PHONE: 'phone' } as const;
export type DuplicateField = (typeof DuplicateField)[keyof typeof DuplicateField];

export class PossibleDuplicateGroupDto {
    @ApiProperty({ enum: Object.values(DuplicateField), description: 'Campo em comum.' })
    field: DuplicateField;

    @ApiProperty({ example: '+5511999990000' })
    value: string;

    @ApiProperty({ type: [CustomerResponseDto], description: 'Clientes com o mesmo valor, do mais antigo para o mais novo.' })
    customers: CustomerResponseDto[];

    static from(group: PossibleDuplicateGroup): PossibleDuplicateGroupDto {
        const dto = new PossibleDuplicateGroupDto();
        dto.field = group.field;
        dto.value = group.value;
        dto.customers = group.customers.map((c) => CustomerResponseDto.from(c));
        return dto;
    }
}
