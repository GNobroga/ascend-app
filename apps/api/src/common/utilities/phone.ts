export const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

const BRAZIL_COUNTRY_CODE = '55';
const BRAZIL_NATIONAL_LENGTHS = [10, 11];

/**
 * Converte para E.164 (`+5511999990000`). Sem `+`, um número com DDD e 10 ou 11 dígitos é tratado como brasileiro;
 * o resultado ainda precisa ser validado com {@link E164_PATTERN}.
 */
export const normalizePhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (value.trim().startsWith('+')) {
        return `+${digits}`;
    }
    const withoutTrunkPrefix = digits.replace(/^0+/, '');
    return BRAZIL_NATIONAL_LENGTHS.includes(withoutTrunkPrefix.length)
        ? `+${BRAZIL_COUNTRY_CODE}${withoutTrunkPrefix}`
        : `+${withoutTrunkPrefix}`;
};
