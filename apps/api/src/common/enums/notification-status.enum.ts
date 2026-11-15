export const NotificationStatus = {
    UNREAD: 'unread',
    READ: 'read',
} as const;

export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];
