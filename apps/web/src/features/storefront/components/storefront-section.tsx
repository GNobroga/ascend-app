import type { ReactNode } from 'react';

type StorefrontSectionProps = {
  id: string;
  title: string;
  description?: string | null;
  actions?: ReactNode;
  children: ReactNode;
};

export function StorefrontSection({ id, title, description, actions, children }: StorefrontSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
