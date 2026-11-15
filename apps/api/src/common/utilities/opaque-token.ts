import { createHash, randomBytes } from 'node:crypto';

/** Token opaco: 32 bytes aleatórios em base64url. */
export const generateOpaqueToken = (): string => randomBytes(32).toString('base64url');

/** SHA-256 (hex) do token; é o que vai para o banco. */
export const hashOpaqueToken = (rawToken: string): string => createHash('sha256').update(rawToken).digest('hex');
