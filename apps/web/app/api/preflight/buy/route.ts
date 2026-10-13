import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { PreflightError, prepareNativeMarketBuy, serializeNativeBuyPreparation } from '@monad-strategy/kuru-adapter';
import { publicClient } from '@/lib/public-client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.account !== 'string' || !isAddress(body.account)) {
      return NextResponse.json({ ok: false, code: 'INVALID_ACCOUNT', error: 'A valid connected account is required.' }, { status: 400 });
    }
    if (typeof body.quoteAmountAtoms !== 'string' || !/^\d+$/.test(body.quoteAmountAtoms)) {
      return NextResponse.json({ ok: false, code: 'INVALID_AMOUNT', error: 'Buy amount must be unsigned USDC atoms.' }, { status: 400 });
    }
    if (typeof body.slippageBps !== 'string' || !/^\d+$/.test(body.slippageBps)) {
      return NextResponse.json({ ok: false, code: 'INVALID_AMOUNT', error: 'Slippage must be unsigned basis points.' }, { status: 400 });
    }
    const preparation = await prepareNativeMarketBuy(publicClient, {
      account: getAddress(body.account), quoteAmountAtoms: BigInt(body.quoteAmountAtoms), slippageBps: BigInt(body.slippageBps),
    });
    return NextResponse.json({ ok: true, preparation: serializeNativeBuyPreparation(preparation) });
  } catch (error) {
    const code = error instanceof PreflightError ? error.code : 'PREFLIGHT_UNAVAILABLE';
    const message = error instanceof Error ? error.message : 'Buy preflight failed.';
    return NextResponse.json({ ok: false, code, error: message }, { status: error instanceof PreflightError ? 422 : 503 });
  }
}
