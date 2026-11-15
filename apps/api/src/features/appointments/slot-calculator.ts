/** Intervalo semiaberto `[start, end)` em milissegundos desde a época. */
export interface Interval {
    start: number;
    end: number;
}

export interface ProfessionalDay {
    professionalId: string;
    /** Expediente do dia já intersectado com o horário do negócio; `null` quando não atende. */
    window: Interval | null;
    /** Ausências e agendamentos que ocupam a agenda. */
    busy: Interval[];
}

export interface SlotOptions {
    durationMs: number;
    stepMs: number;
    /** Nenhum horário começa antes deste instante (antecedência mínima). */
    notBefore?: number;
}

export interface Slot extends Interval {
    professionalIds: string[];
}

export const intersect = (a: Interval, b: Interval): Interval | null => {
    const start = Math.max(a.start, b.start);
    const end = Math.min(a.end, b.end);
    return start < end ? { start, end } : null;
};

const overlaps = (a: Interval, b: Interval): boolean => a.start < b.end && b.start < a.end;

export const fitsInDay = ({ window, busy }: ProfessionalDay, candidate: Interval): boolean =>
    !!window && candidate.start >= window.start && candidate.end <= window.end && !busy.some((b) => overlaps(b, candidate));


export const computeSlots = (days: ProfessionalDay[], { durationMs, stepMs, notBefore }: SlotOptions): Slot[] => {
    const professionalsByStart = new Map<number, string[]>();

    for (const day of days) {
        if (!day.window) {
            continue;
        }
        for (let start = day.window.start; start + durationMs <= day.window.end; start += stepMs) {
            if ((notBefore !== undefined && start < notBefore) || !fitsInDay(day, { start, end: start + durationMs })) {
                continue;
            }
            professionalsByStart.set(start, [...(professionalsByStart.get(start) ?? []), day.professionalId]);
        }
    }

    return [...professionalsByStart.entries()]
        .sort(([a], [b]) => a - b)
        .map(([start, professionalIds]) => ({ start, end: start + durationMs, professionalIds }));
};
