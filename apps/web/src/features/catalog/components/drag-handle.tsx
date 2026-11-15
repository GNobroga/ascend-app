import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { GripVerticalIcon } from 'lucide-react';

type DragHandleProps = {
  label: string;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
};

export function DragHandle({ label, attributes, listeners, setActivatorNodeRef }: DragHandleProps) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={label}
      className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
}
