import { cn } from '@packages/ui/lib/utils';
import type { ReactNode } from 'react';

const SIZE_CLASSES = {
  default: 'mx-auto max-w-[100rem]',
  narrow: 'mx-auto max-w-4xl',
  full: '',
} as const;

type PageContainerProps = {
  size?: keyof typeof SIZE_CLASSES;
  children: ReactNode;
};

export function PageContainer({ size = 'default', children }: PageContainerProps) {
  return <div className={cn('flex w-full flex-col gap-6', SIZE_CLASSES[size])}>{children}</div>;
}
