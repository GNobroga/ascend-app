const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;

/** Remove a máscara (`.`, `/`, `-`, espaços) e coloca em maiúsculas. */
export const normalizeTaxId = (value: string): string => value.replace(/[.\-/\s]/g, '').toUpperCase();

// Desde 07/2026 o CNPJ pode ser alfanumérico nas 12 primeiras posições; cada caractere vale (código ASCII - 48),
// o que mantém o cálculo idêntico para CNPJs só numéricos.
const charValue = (char: string): number => char.charCodeAt(0) - 48;

const checkDigit = (base: string, weights: number[]): number => {
  const sum = [...base].reduce((acc, char, i) => acc + charValue(char) * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

const isValidCpf = (cpf: string): boolean => {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) {
    return false;
  }
  const first = checkDigit(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(cpf.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cpf.endsWith(`${first}${second}`);
};

const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const isValidCnpj = (cnpj: string): boolean => {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }
  const first = checkDigit(cnpj.slice(0, 12), CNPJ_WEIGHTS.slice(1));
  const second = checkDigit(cnpj.slice(0, 13), CNPJ_WEIGHTS);
  return cnpj.endsWith(`${first}${second}`);
};

/** CPF (11 dígitos) ou CNPJ (14 caracteres, alfanumérico ou não), já sem máscara. */
export const isValidTaxId = (value: string): boolean => {
  if (value.length === CPF_LENGTH) {
    return isValidCpf(value);
  }
  return value.length === CNPJ_LENGTH && isValidCnpj(value);
};
