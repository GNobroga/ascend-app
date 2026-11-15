import { CommissionMode } from '../../common/enums/commission-mode.enum.js';

export interface PricedService {
    id: string;
    price: number;
    durationInMinutes: number;
}

export interface PricedLine {
    serviceId: string;
    listPrice: number;
    price: number;
    durationMinutes: number;
    commissionPercent: number;
    commissionAmount: number;
}

export interface AppointmentPricing {
    lines: PricedLine[];
    totalPrice: number;
    commissionMode: CommissionMode | null;
    commissionPercent: number | null;
    commissionAmount: number;
}

export interface PackagePricingInput {
    price: number;
    commissionMode: CommissionMode;
    services: PricedService[];
    packagePercent: number;
}

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const commissionOf = (price: number, percent: number): number => roundMoney(price * percent / 100);

export const prorate = (total: number, weights: number[]): number[] => {
    const totalCents = Math.round(total * 100);
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    const effective = weightSum > 0 ? weights : weights.map(() => 1);
    const effectiveSum = weightSum > 0 ? weightSum : weights.length;

    const shares = effective.map((w) => Math.round(totalCents * w / effectiveSum));
    const remainder = totalCents - shares.reduce((sum, s) => sum + s, 0);
    const largest = shares.indexOf(Math.max(...shares));
    shares[largest] += remainder;
    return shares.map((cents) => cents / 100);
};

export const priceServices = (services: PricedService[], percentFor: (serviceId: string) => number): AppointmentPricing => {
    const lines = services.map((service) => {
        const commissionPercent = percentFor(service.id);
        return {
            serviceId: service.id,
            listPrice: service.price,
            price: service.price,
            durationMinutes: service.durationInMinutes,
            commissionPercent,
            commissionAmount: commissionOf(service.price, commissionPercent),
        };
    });
    return {
        lines,
        totalPrice: roundMoney(lines.reduce((total, line) => total + line.price, 0)),
        commissionMode: null,
        commissionPercent: null,
        commissionAmount: 0,
    };
};

export const pricePackage = (pkg: PackagePricingInput, percentFor: (serviceId: string) => number): AppointmentPricing => {
    const shares = prorate(pkg.price, pkg.services.map((s) => s.price));
    const prorated = pkg.commissionMode === CommissionMode.PRORATED;

    const lines = pkg.services.map((service, i) => {
        const commissionPercent = prorated ? percentFor(service.id) : 0;
        return {
            serviceId: service.id,
            listPrice: service.price,
            price: shares[i],
            durationMinutes: service.durationInMinutes,
            commissionPercent,
            commissionAmount: commissionOf(shares[i], commissionPercent),
        };
    });
    return {
        lines,
        totalPrice: pkg.price,
        commissionMode: pkg.commissionMode,
        commissionPercent: prorated ? null : pkg.packagePercent,
        commissionAmount: prorated ? 0 : commissionOf(pkg.price, pkg.packagePercent),
    };
};
