import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { ImageUpload, UploadedImage } from '../../common/storage/image-upload.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

const UNAUTHENTICATED = 'Access token ausente ou inválido (`UNAUTHENTICATED`).';

@ApiTags('users')
@ApiCookieAuth()
@Controller('/api/users/me')
export class UsersController {

    constructor(private readonly users: UsersService) { }

    @Get()
    @ApiOperation({ summary: 'Usuário autenticado' })
    @ApiDataResponse(UserResponseDto)
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    async me(@CurrentUser('id') userId: string): Promise<ApiResponse<UserResponseDto>> {
        return ApiResponse.of(UserResponseDto.from(await this.users.getCurrent(userId)));
    }

    @Patch()
    @ApiOperation({ summary: 'Atualiza o perfil', description: 'Só os campos enviados são alterados. Trocar o telefone zera `phoneVerifiedAt`. E-mail e senha não são alterados aqui.' })
    @ApiDataResponse(UserResponseDto, { description: 'Perfil atualizado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    async update(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto): Promise<ApiResponse<UserResponseDto>> {
        return ApiResponse.of(UserResponseDto.from(await this.users.updateProfile(userId, dto)));
    }

    @Put('photo')
    @ImageUpload()
    @ApiOperation({ summary: 'Define a foto de perfil', description: 'Substitui a foto atual: o arquivo enviado antes é removido do storage, e a foto externa (Google) deixa de ser usada.' })
    @ApiDataResponse(UserResponseDto, { description: 'Usuário com o novo `photoUrl`.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Arquivo ausente (`VALIDATION_ERROR`) ou que não é imagem (`INVALID_IMAGE`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    async setPhoto(@CurrentUser('id') userId: string, @UploadedImage() file: Buffer): Promise<ApiResponse<UserResponseDto>> {
        return ApiResponse.of(UserResponseDto.from(await this.users.setPhoto(userId, file)));
    }

    @Delete('photo')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove a foto de perfil', description: 'Remove a foto enviada (e o arquivo do storage) e também a foto externa (Google). Sem foto, não faz nada.' })
    @ApiNoContentResponse({ description: 'Foto removida.' })
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    async removePhoto(@CurrentUser('id') userId: string): Promise<void> {
        await this.users.removePhoto(userId);
    }
}
