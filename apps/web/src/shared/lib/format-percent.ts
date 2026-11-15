const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export const formatPercent = (value: number) => `${percentFormatter.format(value)}%`;
