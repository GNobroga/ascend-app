import { storageUrl } from '../../common/storage/storage-url.js';
import type { UserEntity } from '../../database/entities/user.entity.js';

export const userPhotoUrl = (user: Pick<UserEntity, 'photoKey' | 'photoUrl'>): string | null =>
    user.photoKey ? storageUrl(user.photoKey) : user.photoUrl;
