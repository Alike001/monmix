import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { PreflightError, prepareUsdcAllowanceRevocation, serializeUsdcRevocationPreparation } from '@monad-strategy/kuru-adapter';
import { publicClient } from '@/lib/public-client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.account !== 'string' || !isAddress(body.account)) {
      return NextResponse.json({ ok: false, code: 'INVALID_ACCOUNT', error: 'A valid wallet address is required.' }, { status: 400 });
    }
    const preparation = await prepareUsdcAllowanceRevocation(publicClient, { account: getAddress(body.account) });
    return NextResponse.json({ ok: true, preparation: serializeUsdcRevocationPreparation(preparation) });
  } catch (error) {
    const code = error instanceof PreflightError ? error.code : 'PREFLIGHT_UNAVAILABLE';
    return NextResponse.json({ ok: false, code, error: error instanceof Error ? error.message : 'Revocation preflight failed.' }, { status: error instanceof PreflightError ? 422 : 503 });
  }
}
