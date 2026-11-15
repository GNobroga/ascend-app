import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { cn } from '@packages/ui/lib/utils';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { minutesToTime, type Lane, type MinuteRange } from '../calendar';

const PX_PER_MINUTE = 1.2;

const MIN_BLOCK_HEIGHT_PX = 22;

const SLOT_MINUTES = 30;

const SNAP_MINUTES = 15;

const SHADE_CLASSES = {
  closed: 'bg-muted/60',
  'time-off':
    'border-y border-dashed bg-[repeating-linear-gradient(135deg,var(--color-muted)_0,var(--color-muted)_6px,transparent_6px,transparent_12px)]',
  free: 'pointer-events-none bg-emerald-500/6',
} as const;

export type GridShade = MinuteRange & {
  key: string;
  label?: string;
  variant: 'closed' | 'time-off' | 'free';
};

export type GridBlock = MinuteRange &
  Lane & {
    key: string;
    content: ReactNode;
    draggable?: boolean;
    occupies?: boolean;
    group?: string;
  };

export type TimeGridColumn = {
  key: string;
  header: ReactNode;
  isToday: boolean;
  shades: GridShade[];
  blocks: GridBlock[];
  slotLabel?: (minutes: number) => string;
  onSlotClick?: (minutes: number) => void;
};

type DropPreview = {
  columnKey: string;
  start: number;
  end: number;
  valid: boolean;
};

type TimeGridProps = {
  columns: TimeGridColumn[];
  startMinutes: number;
  endMinutes: number;
  nowMinutes: number | null;
  minColumnWidth: string;
  onBlockMove?: (blockKey: string, columnKey: string, start: number) => void;
};

const toPx = (minutes: number) => minutes * PX_PER_MINUTE;

const formatHour = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:00`;

const overlaps = (a: MinuteRange, b: MinuteRange) => a.start < b.end && b.start < a.end;

export function TimeGrid({ columns, startMinutes, endMinutes, nowMinutes, minColumnWidth, onBlockMove }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const [dragging, setDragging] = useState<{ block: GridBlock; columnKey: string } | null>(null);
  const [preview, setPreview] = useState<DropPreview | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const height = toPx(endMinutes - startMinutes);
  const hours = Array.from(
    { length: Math.floor((endMinutes - startMinutes) / 60) + 1 },
    (_, index) => startMinutes + index * 60,
  );
  const showNow = nowMinutes !== null && nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  const scrollTarget = showNow ? toPx(nowMinutes - startMinutes) : 0;

  useEffect(() => {
    if (hasScrolled.current) return;
    hasScrolled.current = true;
    scrollRef.current?.scrollTo({ top: Math.max(scrollTarget - 120, 0) });
  }, [scrollTarget]);

  const previewFor = ({ active, over }: DragMoveEvent | DragEndEvent): DropPreview | null => {
    const translated = active.rect.current.translated;
    const column = columns.find(({ key }) => key === over?.id);
    if (!dragging || !over || !translated || !column) return null;

    const duration = dragging.block.end - dragging.block.start;
    const raw = startMinutes + (translated.top - over.rect.top) / PX_PER_MINUTE;
    const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
    const start = Math.min(Math.max(snapped, startMinutes), endMinutes - duration);
    const range = { start, end: start + duration };
    const blocked =
      column.shades.some((shade) => shade.variant !== 'free' && overlaps(shade, range)) ||
      column.blocks.some(
        (block) =>
          block.key !== dragging.block.key &&
          block.occupies &&
          (dragging.block.group === undefined || block.group === dragging.block.group) &&
          overlaps(block, range),
      );
    return { columnKey: column.key, ...range, valid: !blocked };
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    for (const column of columns) {
      const block = column.blocks.find(({ key }) => key === active.id);
      if (block) setDragging({ block, columnKey: column.key });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const drop = previewFor(event);
    const moved = drop && dragging && (drop.columnKey !== dragging.columnKey || drop.start !== dragging.block.start);
    if (drop?.valid && moved) onBlockMove?.(String(event.active.id), drop.columnKey, drop.start);
    setDragging(null);
    setPreview(null);
  };

  const gridTemplateColumns = `3.5rem repeat(${columns.length}, minmax(${minColumnWidth}, 1fr))`;
  const hourLines = `repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${toPx(60)}px)`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={(event) => setPreview(previewFor(event))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDragging(null);
        setPreview(null);
      }}
    >
      <div
        ref={scrollRef}
        className="h-full overflow-auto overscroll-contain rounded-2xl border bg-card"
      >
        <div className="grid min-w-fit" style={{ gridTemplateColumns }}>
          <div className="sticky top-0 left-0 z-30 border-b bg-card" />
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                'sticky top-0 z-20 flex min-h-12 items-center justify-center border-b border-l bg-card px-2 py-2 text-center text-sm',
                column.isToday && 'text-primary',
              )}
            >
              {column.header}
            </div>
          ))}

          <div className="sticky left-0 z-10 bg-card" style={{ height }}>
            {hours.map((minutes) => (
              <span
                key={minutes}
                className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums first:translate-y-0"
                style={{ top: toPx(minutes - startMinutes) }}
              >
                {formatHour(minutes)}
              </span>
            ))}
          </div>

          {columns.map((column) => (
            <GridColumnBody
              key={column.key}
              column={column}
              startMinutes={startMinutes}
              endMinutes={endMinutes}
              height={height}
              hourLines={hourLines}
              nowMinutes={showNow ? nowMinutes : null}
              draggingKey={dragging?.block.key ?? null}
              preview={preview?.columnKey === column.key ? preview : null}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

type GridColumnBodyProps = {
  column: TimeGridColumn;
  startMinutes: number;
  endMinutes: number;
  height: number;
  hourLines: string;
  nowMinutes: number | null;
  draggingKey: string | null;
  preview: DropPreview | null;
};

function GridColumnBody({
  column,
  startMinutes,
  endMinutes,
  height,
  hourLines,
  nowMinutes,
  draggingKey,
  preview,
}: GridColumnBodyProps) {
  const { setNodeRef } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className="relative border-l"
      style={{ height, backgroundImage: hourLines, backgroundPositionY: toPx(-(startMinutes % 60)) }}
    >
      {column.onSlotClick &&
        Array.from({ length: Math.ceil((endMinutes - startMinutes) / SLOT_MINUTES) }, (_, index) => {
          const minutes = startMinutes + index * SLOT_MINUTES;
          return (
            <button
              key={minutes}
              type="button"
              aria-label={column.slotLabel?.(minutes)}
              onClick={() => column.onSlotClick?.(minutes)}
              className="absolute inset-x-0 outline-none hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
              style={{ top: toPx(minutes - startMinutes), height: toPx(SLOT_MINUTES) }}
            />
          );
        })}

      {column.shades.map((shade) => (
        <div
          key={shade.key}
          className={cn('absolute inset-x-0 overflow-hidden', SHADE_CLASSES[shade.variant])}
          style={{ top: toPx(shade.start - startMinutes), height: toPx(shade.end - shade.start) }}
        >
          {shade.label && (
            <span
              className={cn(
                'm-1 inline-block rounded-md px-1.5 py-0.5 text-xs',
                shade.variant === 'free'
                  ? 'text-emerald-700/80 dark:text-emerald-300/80'
                  : 'bg-card/90 text-muted-foreground',
              )}
            >
              {shade.label}
            </span>
          )}
        </div>
      ))}

      {column.blocks.map((block) => (
        <DraggableBlock
          key={block.key}
          block={block}
          startMinutes={startMinutes}
          isDragging={draggingKey === block.key}
        />
      ))}

      {preview && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0.5 z-20 flex items-start rounded-lg border-2 border-dashed px-2 py-1 text-xs font-medium',
            preview.valid
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive bg-destructive/15 text-destructive',
          )}
          style={{ top: toPx(preview.start - startMinutes), height: toPx(preview.end - preview.start) }}
        >
          {minutesToTime(preview.start)}–{minutesToTime(preview.end)}
        </div>
      )}

      {nowMinutes !== null && column.isToday && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-destructive before:absolute before:-top-1 before:-left-1 before:size-2.5 before:rounded-full before:bg-destructive"
          style={{ top: toPx(nowMinutes - startMinutes) }}
        />
      )}
    </div>
  );
}

type DraggableBlockProps = {
  block: GridBlock;
  startMinutes: number;
  isDragging: boolean;
};

function DraggableBlock({ block, startMinutes, isDragging }: DraggableBlockProps) {
  const { setNodeRef, listeners } = useDraggable({ id: block.key, disabled: !block.draggable });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={cn('absolute px-0.5', block.draggable && 'cursor-grab', isDragging && 'opacity-40')}
      style={{
        top: toPx(block.start - startMinutes),
        height: Math.max(toPx(block.end - block.start), MIN_BLOCK_HEIGHT_PX),
        left: `${(block.lane / block.lanes) * 100}%`,
        width: `${100 / block.lanes}%`,
      }}
    >
      {block.content}
    </div>
  );
}
