import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { BooleanQuery } from '../../../common/http/boolean-query.js';

export class ServiceCategoryListQueryDto {
    @ApiPropertyOptional({ description: 'Filtra por situação; omitido traz todas.', type: Boolean })
    @IsOptional()
    @BooleanQuery()
    @IsBoolean()
    isActive?: boolean;
}

export class ServiceListQueryDto extends ServiceCategoryListQueryDto {
    @ApiPropertyOptional({ description: 'Filtra pela categoria.', format: 'uuid' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;
}
