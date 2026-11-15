import { env } from '../../config/env.config.js';

export const storageUrl = (key: string): string => `${env.STORAGE_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
