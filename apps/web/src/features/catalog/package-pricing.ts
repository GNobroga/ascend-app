export type PackageDiscount = {
  amount: number;
  percent: number;
};

export const packageDiscount = (price: number, servicesPrice: number): PackageDiscount | null => {
  if (servicesPrice <= 0 || price >= servicesPrice) return null;

  const amount = Math.round((servicesPrice - price) * 100) / 100;
  return { amount, percent: Math.round((amount / servicesPrice) * 100) };
};
