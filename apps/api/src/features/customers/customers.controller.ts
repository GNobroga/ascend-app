import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse, ApiPaginatedResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import { CustomersService } from './customers.service.js';
import {
    BlockCustomerDto,
    CreateCustomerDto,
    CustomerListQueryDto,
    CustomerResponseDto,
    PayUnblockFeeDto,
    PossibleDuplicateGroupDto,
    UpdateCustomerDto,
} from './dto/customer.dto.js';

const CUSTOMER_NOT_FOUND = 'Cliente não encontrado neste negócio (`CUSTOMER_NOT_FOUND`).';
const POSSIBLE_DUPLICATE = 'Outro cliente tem o mesmo telefone ou e-mail (`CUSTOMER_POSSIBLE_DUPLICATE`). '
    + 'Cada item de `details` tem o campo em `path` e o id do cliente existente em `message`. Reenvie com `allowDuplicate: true` para gravar mesmo assim.';

@ApiTags('customers')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/customers`)
export class CustomersController {

    constructor(private readonly customers: CustomersService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista os clientes', description: 'Paginada e ordenada por nome. `search` procura em nome, e-mail e telefone.' })
    @ApiPaginatedResponse(CustomerResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida (`VALIDATION_ERROR`).')
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @Query() query: CustomerListQueryDto): Promise<ApiResponse<CustomerResponseDto[]>> {
        const [customers, total] = await this.customers.list(businessId, query);
        return ApiResponse.paginated(customers.map((c) => CustomerResponseDto.from(c)), total, query);
    }

    @Get('possible-duplicates')
    @BusinessAccess()
    @ApiOperation({ summary: 'Possíveis clientes duplicados', description: 'Grupos de clientes com o mesmo telefone ou o mesmo e-mail, calculados na hora.' })
    @ApiDataResponse(PossibleDuplicateGroupDto, { isArray: true })
    async possibleDuplicates(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<PossibleDuplicateGroupDto[]>> {
        const groups = await this.customers.findPossibleDuplicates(businessId);
        return ApiResponse.of(groups.map((g) => PossibleDuplicateGroupDto.from(g)));
    }

    @Get(':customerId')
    @BusinessAccess()
    @ApiOperation({ summary: 'Detalhes do cliente' })
    @ApiDataResponse(CustomerResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`customerId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, CUSTOMER_NOT_FOUND)
    async findOne(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('customerId') customerId: string): Promise<ApiResponse<CustomerResponseDto>> {
        return ApiResponse.of(CustomerResponseDto.from(await this.customers.getById(businessId, customerId)));
    }

    @Post()
    @BusinessAccess()
    @ApiOperation({ summary: 'Cadastra um cliente', description: 'Cliente sem conta, cadastrado pela equipe. O telefone é gravado em E.164 e o e-mail em minúsculas.' })
    @ApiDataResponse(CustomerResponseDto, { status: HttpStatus.CREATED, description: 'Cliente criado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, POSSIBLE_DUPLICATE)
    async create(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: CreateCustomerDto): Promise<ApiResponse<CustomerResponseDto>> {
        return ApiResponse.of(CustomerResponseDto.from(await this.customers.create(businessId, dto)));
    }

    @Patch(':customerId')
    @BusinessAccess()
    @ApiOperation({ summary: 'Atualiza um cliente', description: 'Só os campos enviados são alterados. A checagem de duplicado só roda quando telefone ou e-mail mudam.' })
    @ApiDataResponse(CustomerResponseDto, { description: 'Cliente atualizado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `customerId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, CUSTOMER_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, POSSIBLE_DUPLICATE)
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('customerId') customerId: string,
        @Body() dto: UpdateCustomerDto,
    ): Promise<ApiResponse<CustomerResponseDto>> {
        return ApiResponse.of(CustomerResponseDto.from(await this.customers.update(businessId, customerId, dto)));
    }

    @Post(':customerId/block')
    @BusinessAccess(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
    @ApiOperation({
        summary: 'Bloqueia o cliente',
        description: 'Impede o cliente de agendar online neste negócio; a equipe continua podendo agendar por ele. `temporary` vence sozinho em `until`; '
            + '`fee` copia a `unblockFee` atual do negócio e dura até a equipe registrar o pagamento. Um bloqueio novo encerra o anterior.',
    })
    @ApiDataResponse(CustomerResponseDto, { status: HttpStatus.CREATED, description: 'Cliente com o bloqueio vigente.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, `until` fora do intervalo permitido ou `fee` sem `unblockFee` configurada (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, CUSTOMER_NOT_FOUND)
    async block(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentUser('id') userId: string,
        @UuidParam('customerId') customerId: string,
        @Body() dto: BlockCustomerDto,
    ): Promise<ApiResponse<CustomerResponseDto>> {
        return ApiResponse.of(CustomerResponseDto.from(await this.customers.block(businessId, userId, customerId, dto)));
    }

    @Post(':customerId/block/fee-payment')
    @HttpCode(HttpStatus.OK)
    @BusinessAccess()
    @ApiOperation({ summary: 'Registra o pagamento da taxa de desbloqueio', description: 'O cliente pagou por fora (Pix, balcão); registrar encerra o bloqueio `fee` na hora.' })
    @ApiDataResponse(CustomerResponseDto, { description: 'Cliente desbloqueado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `customerId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, `${CUSTOMER_NOT_FOUND} Forma de pagamento ativa não encontrada (\`PAYMENT_METHOD_NOT_FOUND\`).`)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'O cliente não tem bloqueio `fee` vigente (`CUSTOMER_NOT_BLOCKED`).')
    async payUnblockFee(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentUser('id') userId: string,
        @UuidParam('customerId') customerId: string,
        @Body() dto: PayUnblockFeeDto,
    ): Promise<ApiResponse<CustomerResponseDto>> {
        return ApiResponse.of(CustomerResponseDto.from(await this.customers.payUnblockFee(businessId, userId, customerId, dto)));
    }

    @Delete(':customerId/block')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
    @ApiOperation({ summary: 'Desbloqueia o cliente', description: 'Encerra o bloqueio vigente sem cobrar a taxa.' })
    @ApiNoContentResponse({ description: 'Cliente desbloqueado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`customerId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, CUSTOMER_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'O cliente não está bloqueado (`CUSTOMER_NOT_BLOCKED`).')
    async unblock(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentUser('id') userId: string,
        @UuidParam('customerId') customerId: string,
    ): Promise<void> {
        await this.customers.unblock(businessId, userId, customerId);
    }

    @Delete(':customerId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
    @ApiOperation({ summary: 'Exclui um cliente', description: 'Exclusão lógica; o cliente some das listas e da detecção de duplicados.' })
    @ApiNoContentResponse({ description: 'Cliente excluído.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`customerId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, CUSTOMER_NOT_FOUND)
    async remove(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('customerId') customerId: string): Promise<void> {
        await this.customers.remove(businessId, customerId);
    }
}
