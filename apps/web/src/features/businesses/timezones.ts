export const BRAZILIAN_TIMEZONES = [
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC−2)' },
  { value: 'America/Sao_Paulo', label: 'Horário de Brasília (UTC−3)' },
  { value: 'America/Manaus', label: 'Amazonas (UTC−4)' },
  { value: 'America/Cuiaba', label: 'Mato Grosso (UTC−4)' },
  { value: 'America/Campo_Grande', label: 'Mato Grosso do Sul (UTC−4)' },
  { value: 'America/Porto_Velho', label: 'Rondônia (UTC−4)' },
  { value: 'America/Boa_Vista', label: 'Roraima (UTC−4)' },
  { value: 'America/Rio_Branco', label: 'Acre (UTC−5)' },
];

export const timezoneOptions = (current: string) =>
  BRAZILIAN_TIMEZONES.some(({ value }) => value === current)
    ? BRAZILIAN_TIMEZONES
    : [...BRAZILIAN_TIMEZONES, { value: current, label: current }];
