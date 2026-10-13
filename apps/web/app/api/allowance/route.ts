import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { PreflightError, readUsdcAllowanceStatus, serializeUsdcAllowanceStatus } from '@monad-strategy/kuru-adapter';
import { publicClient } from '@/lib/public-client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const address = new URL(request.url).searchParams.get('address');
    if (!address || !isAddress(address)) return NextResponse.json({ ok: false, code: 'INVALID_ACCOUNT', error: 'A valid wallet address is required.' }, { status: 400 });
    const status = await readUsdcAllowanceStatus(publicClient, getAddress(address));
    return NextResponse.json({ ok: true, status: serializeUsdcAllowanceStatus(status) });
  } catch (error) {
    const code = error instanceof PreflightError ? error.code : 'ALLOWANCE_UNAVAILABLE';
    return NextResponse.json({ ok: false, code, error: error instanceof Error ? error.message : 'Allowance read failed.' }, { status: error instanceof PreflightError ? 422 : 503 });
  }
}
