import { NextResponse } from 'next/server';
import { readMarketSnapshot, serializeMarketSnapshot } from '@monad-strategy/kuru-adapter';
import { publicClient } from '@/lib/public-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await readMarketSnapshot(publicClient);
    return NextResponse.json(
      { ok: true, snapshot: serializeMarketSnapshot(snapshot) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Monad market data unavailable',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
