import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import {
  PreflightError,
  prepareNativeMarketSell,
  serializeNativeSellPreparation,
} from '@monad-strategy/kuru-adapter';
import { publicClient } from '@/lib/public-client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.account !== 'string' || !isAddress(body.account)) {
      return NextResponse.json({ ok: false, code: 'INVALID_ACCOUNT', error: 'A valid connected account is required.' }, { status: 400 });
    }
    if (typeof body.baseAmountAtoms !== 'string' || !/^\d+$/.test(body.baseAmountAtoms)) {
      return NextResponse.json({ ok: false, code: 'INVALID_AMOUNT', error: 'Sell amount must be unsigned token atoms.' }, { status: 400 });
    }
    if (typeof body.slippageBps !== 'string' || !/^\d+$/.test(body.slippageBps)) {
      return NextResponse.json({ ok: false, code: 'INVALID_AMOUNT', error: 'Slippage must be unsigned basis points.' }, { status: 400 });
    }
    const preparation = await prepareNativeMarketSell(publicClient, {
      account: getAddress(body.account),
      baseAmountAtoms: BigInt(body.baseAmountAtoms),
      slippageBps: BigInt(body.slippageBps),
    });
    return NextResponse.json({ ok: true, preparation: serializeNativeSellPreparation(preparation) });
  } catch (error) {
    const code = error instanceof PreflightError ? error.code : 'PREFLIGHT_UNAVAILABLE';
    const message = error instanceof Error ? error.message : 'Preflight failed.';
    return NextResponse.json({ ok: false, code, error: message }, { status: error instanceof PreflightError ? 422 : 503 });
  }
}
