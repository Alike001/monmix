import { formatAtoms, powerOfTenDecimals } from '@monad-strategy/domain';

export const formatPriceX18 = (value: string | bigint) =>
  formatAtoms(BigInt(value), 18, 6);

export const formatRaw = (value: string | bigint, precision: string | bigint, places = 6) =>
  formatAtoms(BigInt(value), powerOfTenDecimals(BigInt(precision)), places);

export function formatAge(seconds: string | bigint) {
  const value = BigInt(seconds);
  if (value < 60n) return `${value}s`;
  return `${value / 60n}m ${value % 60n}s`;
}

export function formatCompactAtoms(value: bigint, decimals: number, places = 4) {
  const rendered = formatAtoms(value, decimals, places);
  const [whole, fraction] = rendered.split('.');
  const grouped = Number(whole).toLocaleString('en-US');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}
