import { isUUID } from 'class-validator';

export interface TimeCursor {
    at: Date;
    id: string;
}

export const encodeCursor = ({ at, id }: TimeCursor): string => Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');

export const decodeCursor = (cursor: string): TimeCursor | null => {
    const [iso, id, ...rest] = Buffer.from(cursor, 'base64url').toString().split('|');
    const at = new Date(iso);
    if (rest.length || !id || !isUUID(id) || Number.isNaN(at.getTime())) {
        return null;
    }
    return { at, id };
};
