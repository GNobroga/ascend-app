import { HttpStatus } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.enum.js';

/** Grupo dentro do qual os itens são ordenados: a chave é a coluna de FK (ex.: `{ businessId }`, `{ serviceId }`). */
export type OrderScope = { businessId: string } | { serviceId: string } | { packageId: string };

const columnOf = (scope: OrderScope): { column: string; id: string } => {
    const [[column, id]] = Object.entries(scope);
    return { column, id };
};

export const reorderWithin = async (repo: Repository<{ id: string; displayOrder: number }>, scope: OrderScope, ids: string[]): Promise<void> => {
    const { column, id: scopeId } = columnOf(scope);
    const existing = await repo.createQueryBuilder('item')
        .select('item.id', 'id')
        .where(`"item"."${column}" = :scopeId`, { scopeId })
        .getRawMany<{ id: string }>();

    const requested = new Set(ids);
    if (existing.length !== requested.size || existing.some(({ id }) => !requested.has(id))) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [
            { path: 'ids', message: 'ids must list every item exactly once' },
        ]);
    }

    await repo.query(
        `UPDATE "${repo.metadata.tableName}" AS item SET "displayOrder" = o.position - 1
         FROM unnest($1::uuid[]) WITH ORDINALITY AS o(id, position)
         WHERE item.id = o.id AND item."${column}" = $2`,
        [ids, scopeId],
    );
};

export const nextDisplayOrder = async (repo: Repository<{ displayOrder: number }>, scope: OrderScope): Promise<number> => {
    const { column, id } = columnOf(scope);
    const { max } = await repo.createQueryBuilder('item')
        .select('MAX(item.displayOrder)', 'max')
        .where(`"item"."${column}" = :id`, { id })
        .getRawOne<{ max: number | null }>() ?? { max: null };
    return max === null ? 0 : max + 1;
};
