const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;
const CPF_FIRST_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_SECOND_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export const normalizeTaxId = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

const charValue = (char: string) => char.charCodeAt(0) - 48;

const checkDigit = (base: string, weights: number[]) => {
  const sum = [...base].reduce((acc, char, index) => acc + charValue(char) * (weights[index] ?? 0), 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

const isValidCpf = (cpf: string) => {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  const first = checkDigit(cpf.slice(0, 9), CPF_FIRST_WEIGHTS);
  const second = checkDigit(cpf.slice(0, 10), CPF_SECOND_WEIGHTS);
  return cpf.endsWith(`${first}${second}`);
};

const isValidCnpj = (cnpj: string) => {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const first = checkDigit(cnpj.slice(0, 12), CNPJ_WEIGHTS.slice(1));
  const second = checkDigit(cnpj.slice(0, 13), CNPJ_WEIGHTS);
  return cnpj.endsWith(`${first}${second}`);
};

export const isValidTaxId = (value: string) => {
  const taxId = normalizeTaxId(value);
  if (taxId.length === CPF_LENGTH) return isValidCpf(taxId);
  if (taxId.length === CNPJ_LENGTH) return isValidCnpj(taxId);
  return false;
};

export const formatTaxId = (value: string) => {
  const taxId = normalizeTaxId(value).slice(0, CNPJ_LENGTH);
  const isCpf = taxId.length <= CPF_LENGTH && /^\d*$/.test(taxId);

  if (isCpf) {
    return taxId
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }

  return taxId
    .replace(/^(\w{2})(\w)/, '$1.$2')
    .replace(/^(\w{2})\.(\w{3})(\w)/, '$1.$2.$3')
    .replace(/^(\w{2})\.(\w{3})\.(\w{3})(\w)/, '$1.$2.$3/$4')
    .replace(/\/(\w{4})(\w{1,2})$/, '/$1-$2');
};
