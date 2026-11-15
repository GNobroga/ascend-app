import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { SocialNetwork } from '../../../common/enums/social-network.enum.js';
import type { BusinessSocialLinkEntity } from '../../../database/entities/business-social-link.entity.js';

const NETWORKS = Object.values(SocialNetwork);
const URL_MAX_LENGTH = 2048;

export class BusinessSocialLinkDto {
    @ApiProperty({ enum: NETWORKS, description: 'Rede social; define o ícone exibido e o domínio aceito em `url`.', example: SocialNetwork.INSTAGRAM })
    @IsIn(NETWORKS)
    network: SocialNetwork;

    @ApiProperty({
        format: 'uri',
        maxLength: URL_MAX_LENGTH,
        description: 'URL `https` do perfil, no domínio da rede (ex.: `instagram.com`); `website` aceita qualquer domínio.',
        example: 'https://instagram.com/barbeariadojoao',
    })
    @IsUrl({ protocols: ['https'], require_protocol: true })
    @MaxLength(URL_MAX_LENGTH)
    url: string;

    static fromAll(links: BusinessSocialLinkEntity[]): BusinessSocialLinkDto[] {
        return links
            .toSorted((a, b) => NETWORKS.indexOf(a.network) - NETWORKS.indexOf(b.network))
            .map((link) => BusinessSocialLinkDto.from(link));
    }

    static from(link: BusinessSocialLinkEntity): BusinessSocialLinkDto {
        const dto = new BusinessSocialLinkDto();
        dto.network = link.network;
        dto.url = link.url;
        return dto;
    }
}

export class SetBusinessSocialLinksDto {
    @ApiProperty({ type: [BusinessSocialLinkDto], description: 'Lista final: substitui todos os links. No máximo um por rede; lista vazia remove todos.', maxItems: NETWORKS.length })
    @IsArray()
    @ArrayMaxSize(NETWORKS.length)
    @ArrayUnique((link: BusinessSocialLinkDto) => link.network)
    @ValidateNested({ each: true })
    @Type(() => BusinessSocialLinkDto)
    links: BusinessSocialLinkDto[];
}
