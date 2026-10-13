const TEN = 10n;

export function powerOfTenDecimals(precision: bigint): number {
  if (precision < 1n) throw new RangeError('Precision must be positive');
  let value = precision;
  let decimals = 0;
  while (value > 1n && value % TEN === 0n) {
    value /= TEN;
    decimals += 1;
  }
  if (value !== 1n) throw new RangeError('Precision must be an exact power of ten');
  return decimals;
}

export function parseDecimalToAtoms(input: string, decimals: number): bigint {
  if (!Number.isSafeInteger(decimals) || decimals < 0) {
    throw new RangeError('Invalid decimal count');
  }
  const value = input.trim();
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new RangeError('Invalid decimal value');
  const [whole = '0', fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new RangeError('Too many decimal places');
  return (
    BigInt(whole) * TEN ** BigInt(decimals) +
    BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0')
  );
}

export function formatAtoms(value: bigint, decimals: number, displayDecimals = decimals): string {
  if (value < 0n) return `-${formatAtoms(-value, decimals, displayDecimals)}`;
  const scale = TEN ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, '0').slice(0, displayDecimals);
  return displayDecimals === 0 ? whole.toString() : `${whole}.${fraction}`;
}
