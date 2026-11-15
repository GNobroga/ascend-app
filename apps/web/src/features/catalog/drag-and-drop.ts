import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

export const useSortableSensors = () =>
  useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

export const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'Para mover, pressione espaço ou enter. Use as setas para escolher a nova posição e pressione espaço ou enter de novo para soltar. Esc cancela.',
};

export const createAnnouncements = (nameOf: (id: UniqueIdentifier) => string): Announcements => ({
  onDragStart: ({ active }) => `${nameOf(active.id)} selecionado.`,
  onDragOver: ({ active, over }) =>
    over ? `${nameOf(active.id)} sobre ${nameOf(over.id)}.` : `${nameOf(active.id)} fora da área de soltar.`,
  onDragEnd: ({ active, over }) =>
    over ? `${nameOf(active.id)} solto em ${nameOf(over.id)}.` : `${nameOf(active.id)} solto.`,
  onDragCancel: ({ active }) => `Movimento de ${nameOf(active.id)} cancelado.`,
});
