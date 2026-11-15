import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import { SubscriptionResponseDto } from './dto/subscription-response.dto.js';
import { SubscriptionsService } from './subscriptions.service.js';

@ApiTags('subscriptions')
@Controller('/api/businesses')
export class SubscriptionsController {

    constructor(private readonly subscriptions: SubscriptionsService) { }

    @Get(`:${BUSINESS_ID_PARAM}/subscription`)
    @BusinessAccess()
    @ApiOperation({
        summary: 'Assinatura do negócio',
        description: 'Status, fim do teste, nível de acesso e as etapas de ativação. O primeiro agendamento criado durante o teste soma `activation.bonusDays` ao fim dele, uma única vez.',
    })
    @ApiDataResponse(SubscriptionResponseDto)
    async get(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<SubscriptionResponseDto>> {
        return ApiResponse.of(SubscriptionResponseDto.from(await this.subscriptions.getOverview(businessId)));
    }
}
