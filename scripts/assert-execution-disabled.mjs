const value = process.env.NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION;

if (value === 'true') {
  console.error('Release build refused: NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION must not be true.');
  process.exit(1);
}

if (value !== undefined && value !== 'false') {
  console.error('Release build refused: NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION must be false or unset.');
  process.exit(1);
}

console.log(`Release execution gate: ${value === 'false' ? 'explicitly false' : 'unset (disabled by code)'}.`);
