export type SellAmountMode = 'STRATEGY_RECOMMENDATION' | 'VENUE_MINIMUM';

export function resolveBoundedSellAmount(input: {
  mode: SellAmountMode;
  recommendedBaseAtoms: bigint;
  declaredMinimumBaseAtoms: bigint;
}): bigint {
  if (input.recommendedBaseAtoms <= 0n || input.declaredMinimumBaseAtoms <= 0n) {
    throw new Error('Sell recommendation and venue minimum must be positive.');
  }
  if (input.recommendedBaseAtoms < input.declaredMinimumBaseAtoms) {
    throw new Error('The strategy recommendation is below the venue minimum.');
  }
  return input.mode === 'VENUE_MINIMUM' ? input.declaredMinimumBaseAtoms : input.recommendedBaseAtoms;
}
