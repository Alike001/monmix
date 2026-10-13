import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { readWalletBalances } from '@monad-strategy/kuru-adapter';
import { publicClient } from '@/lib/public-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address || !isAddress(address)) {
    return NextResponse.json({ ok: false, error: 'Invalid wallet address' }, { status: 400 });
  }
  try {
    const balances = await readWalletBalances(publicClient, address);
    return NextResponse.json(
      { ok: true, mon: balances.mon.toString(), usdc: balances.usdc.toString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Balance read failed' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
