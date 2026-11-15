const MINUTES_PER_HOUR = 60;

const HOURS_PER_DAY = 24;

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

export const formatHours = (hours: number) => {
  if (hours >= HOURS_PER_DAY && hours % HOURS_PER_DAY === 0) {
    return plural(hours / HOURS_PER_DAY, 'dia', 'dias');
  }
  return plural(hours, 'hora', 'horas');
};

export const formatMinutes = (minutes: number) => {
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  if (rest > 0) return `${hours}h${String(rest).padStart(2, '0')}`;
  return formatHours(hours);
};
