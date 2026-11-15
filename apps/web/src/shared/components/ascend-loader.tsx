import { cn } from '@packages/ui/lib/utils';
import { useId, type ComponentProps } from 'react';

export function AscendLoader({ className, ...props }: ComponentProps<'output'>) {
  const id = useId();
  const gradientId = `${id}-gradient`;
  const clipId = `${id}-clip`;

  return (
    <output aria-label="Carregando" className={cn('block size-16', className)} {...props}>
      <svg viewBox="190 230 640 560" aria-hidden="true" className="size-full">
        <defs>
          <linearGradient id={gradientId} x1="208" y1="775" x2="815" y2="248" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3b2fc4" />
            <stop offset="0.45" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#1cc8e0" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x="190" y="200" width="640" height="575" />
          </clipPath>
        </defs>
        <g fill={`url(#${gradientId})`}>
          <polygon points="208,775 512,248 586,378 548,425 512,368 385,590 405,590 248,775" />
          <polygon points="652,485 815,775 746,775 675,650 508,650 555,590 640,590 606,535" />
          <g clipPath={`url(#${clipId})`}>
            <polygon
              points="288,775 655,340 614,300 768,262 742,418 700,380 362,775"
              className="animate-ascend-arrow motion-reduce:animate-none"
            />
          </g>
        </g>
      </svg>
    </output>
  );
}
