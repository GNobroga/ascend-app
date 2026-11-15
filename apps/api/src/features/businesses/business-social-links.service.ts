import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialNetwork } from '../../common/enums/social-network.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { BusinessSocialLinkEntity } from '../../database/entities/business-social-link.entity.js';
import type { BusinessSocialLinkDto } from './dto/business-social-link.dto.js';

const NETWORK_DOMAINS: Record<SocialNetwork, string[] | null> = {
    [SocialNetwork.INSTAGRAM]: ['instagram.com'],
    [SocialNetwork.FACEBOOK]: ['facebook.com', 'fb.com'],
    [SocialNetwork.TIKTOK]: ['tiktok.com'],
    [SocialNetwork.YOUTUBE]: ['youtube.com', 'youtu.be'],
    [SocialNetwork.X]: ['x.com', 'twitter.com'],
    [SocialNetwork.LINKEDIN]: ['linkedin.com'],
    [SocialNetwork.WEBSITE]: null,
};

@Injectable()
export class BusinessSocialLinksService {

    constructor(@InjectRepository(BusinessSocialLinkEntity) private readonly links: Repository<BusinessSocialLinkEntity>) { }

    findByBusiness(businessId: string): Promise<BusinessSocialLinkEntity[]> {
        return this.links.find({ where: { business: { id: businessId } } });
    }

    async replaceAll(businessId: string, links: BusinessSocialLinkDto[]): Promise<BusinessSocialLinkEntity[]> {
        const invalid = links.flatMap((link, index) => BusinessSocialLinksService.matchesNetwork(link)
            ? []
            : [{ path: `links.${index}.url`, message: `url must be a ${link.network} address` }]);
        if (invalid.length > 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', invalid);
        }

        await this.links.manager.transaction(async (manager) => {
            const repo = manager.getRepository(BusinessSocialLinkEntity);
            await repo.delete({ business: { id: businessId } });
            await repo.save(links.map((link) => repo.create({
                business: { id: businessId },
                network: link.network,
                url: new URL(link.url).toString(),
            })));
        });

        return this.findByBusiness(businessId);
    }

    private static matchesNetwork({ network, url }: BusinessSocialLinkDto): boolean {
        const domains = NETWORK_DOMAINS[network];
        if (!domains) return true;

        const host = new URL(url).hostname.toLowerCase();
        return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
    }
}
