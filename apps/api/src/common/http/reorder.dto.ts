import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderDto {
    @ApiProperty({ type: [String], format: 'uuid', description: 'Todos os ids, cada um uma vez, na nova ordem; o índice vira o `displayOrder`.' })
    @IsArray()
    @ArrayUnique()
    @IsUUID('all', { each: true })
    ids: string[];
}
