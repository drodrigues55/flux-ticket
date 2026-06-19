export function normalizeCpf(value: string): string {
  return (value || '').replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor;
      factor -= 1;
    }
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateDigit(cpf.slice(0, 10), 11);

  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}

export function assertValidCpf(value: string, label = 'CPF'): string {
  const cpf = normalizeCpf(value);
  if (!isValidCpf(cpf)) {
    throw new Error(`${label} inválido`);
  }
  return cpf;
}
