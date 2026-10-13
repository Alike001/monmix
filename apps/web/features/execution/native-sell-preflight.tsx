'use client';

import { useRef, useState } from 'react';
import type { Address } from 'viem';
import { useConnection, useWriteContract } from 'wagmi';
import {
  decodeKuruTrades,
  KURU_DIRECT_ORDER_ABI,
  MONAD_MAINNET_CHAIN_ID,
  type NativeSellPreparationDto,
} from '@monad-strategy/kuru-adapter';
import { formatCompactAtoms } from '@/lib/format';
import { publicClient } from '@/lib/public-client';
import {
  beginJournalRecord,
  updateJournalRecord,
  walletFailureStatus,
} from '@/lib/transaction-journal';
import { assertWalletExecutionContext } from '@/lib/wallet-state';

type PreflightState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; code: string; message: string }
  | { kind: 'ready'; preparation: NativeSellPreparationDto };

const EXECUTION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION === 'true';

export function NativeSellPreflight({ account, baseAmountAtoms }: { account: Address; baseAmountAtoms: bigint }) {
  const connection = useConnection();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<PreflightState>({ kind: 'idle' });
  const [executionMessage, setExecutionMessage] = useState('');
  const inFlight = useRef(false);

  async function requestPreflight(): Promise<NativeSellPreparationDto> {
    const response = await fetch('/api/preflight/sell', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ account, baseAmountAtoms: baseAmountAtoms.toString(), slippageBps: '50' }),
    });
    const payload = await response.json() as
      | { ok: true; preparation: NativeSellPreparationDto }
      | { ok: false; code: string; error: string };
    if (!response.ok || !payload.ok) {
      const failure = payload as { ok: false; code: string; error: string };
      throw Object.assign(new Error(failure.error), { code: failure.code });
    }
    return payload.preparation;
  }

  async function simulate() {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({ kind: 'loading' });
    setExecutionMessage('');
    try {
      setState({ kind: 'ready', preparation: await requestPreflight() });
    } catch (error) {
      const failure = error as Error & { code?: string };
      setState({ kind: 'error', code: failure.code ?? 'PREFLIGHT_UNAVAILABLE', message: failure.message });
    } finally {
      inFlight.current = false;
    }
  }

  async function execute() {
    if (!EXECUTION_ENABLED || state.kind !== 'ready' || inFlight.current) return;
    inFlight.current = true;
    setExecutionMessage('Revalidating immediately before wallet confirmation…');
    let journalId: string | undefined;
    let hash: `0x${string}` | undefined;
    try {
      if (connection.status !== 'connected' || !connection.address || connection.chainId !== MONAD_MAINNET_CHAIN_ID) {
        throw new Error('Wallet account or network changed. Reconnect and simulate again.');
      }
      const fresh = await requestPreflight();
      const now = BigInt(Math.floor(Date.now() / 1000));
      assertWalletExecutionContext(connection, fresh, now);
      const journal = beginJournalRecord(window.localStorage, {
        fingerprint: fresh.fingerprint,
        account: fresh.account,
        chainId: 143,
        marketAddress: fresh.marketAddress,
        baseAmountAtoms: fresh.baseAmountAtoms,
        minimumQuoteAtoms: fresh.minimumQuoteAtoms,
      });
      journalId = journal.id;
      setExecutionMessage('Awaiting explicit confirmation in your wallet. Do not confirm unexpected values.');
      hash = await writeContractAsync({
        account: fresh.account,
        chainId: 143,
        address: fresh.marketAddress,
        abi: KURU_DIRECT_ORDER_ABI,
        functionName: 'placeAndExecuteMarketSell',
        args: [BigInt(fresh.sizeRaw), BigInt(fresh.minimumQuoteAtoms), false, true],
        value: BigInt(fresh.baseAmountAtoms),
      });
      updateJournalRecord(window.localStorage, journal.id, { status: 'BROADCAST', hash });
      setExecutionMessage(`Broadcast ${hash.slice(0, 10)}… Waiting for a receipt; the app will not retry.`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      if (receipt.status === 'reverted') {
        updateJournalRecord(window.localStorage, journal.id, { status: 'REVERTED', blockNumber: receipt.blockNumber.toString() });
        setExecutionMessage('Transaction reverted. No retry was attempted.');
        return;
      }
      const trades = decodeKuruTrades(receipt.logs, fresh.account);
      if (trades.length === 0) {
        updateJournalRecord(window.localStorage, journal.id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), error: 'Successful receipt contained no verified Kuru Trade event.' });
        setExecutionMessage('Receipt found, but no matching Kuru Trade event was verified. Marked unresolved.');
        return;
      }
      const filledSizeRaw = trades.reduce((sum, trade) => sum + trade.filledSizeRaw, 0n);
      updateJournalRecord(window.localStorage, journal.id, { status: 'CONFIRMED', blockNumber: receipt.blockNumber.toString(), filledSizeRaw: filledSizeRaw.toString() });
      window.dispatchEvent(new Event('strategy-desk:balances-stale'));
      setExecutionMessage(`Confirmed with ${trades.length} verified Kuru fill event${trades.length === 1 ? '' : 's'}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet or receipt request failed.';
      if (journalId) updateJournalRecord(window.localStorage, journalId, {
        status: hash ? 'UNRESOLVED' : walletFailureStatus(error),
        ...(hash ? { hash } : {}),
        error: message,
      });
      setExecutionMessage(message);
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <section className="preflight" aria-live="polite">
      <div className="preflight-head">
        <div><span className="eyebrow">Exact Kuru preflight</span><h3>Simulate the transaction that the wallet would receive.</h3></div>
        <button className="button small" type="button" onClick={simulate} disabled={state.kind === 'loading'}>{state.kind === 'loading' ? 'Simulating…' : 'Run simulation'}</button>
      </div>
      <p className="supporting-copy">Re-reads the proxy, order book, balance and gas; then simulates a 0.50% protected, fill-or-kill native MON sell. Simulation never signs or broadcasts.</p>
      {state.kind === 'error' ? <div className="notice danger"><strong>{state.code}</strong><br />{state.message}</div> : null}
      {state.kind === 'ready' ? <PreparedReview value={state.preparation} onExecute={execute} executionMessage={executionMessage} /> : null}
    </section>
  );
}

function PreparedReview({ value, onExecute, executionMessage }: { value: NativeSellPreparationDto; onExecute: () => void; executionMessage: string }) {
  return (
    <div className="prepared-review">
      <div className="review-metrics">
        <Metric label="Exact MON sent" value={`${formatCompactAtoms(BigInt(value.baseAmountAtoms), 18, 6)} MON`} />
        <Metric label="Simulated output" value={`${formatCompactAtoms(BigInt(value.expectedQuoteAtoms), 6, 6)} USDC`} />
        <Metric label="Minimum output" value={`${formatCompactAtoms(BigInt(value.minimumQuoteAtoms), 6, 6)} USDC`} />
        <Metric label="Protection" value="0.50% · fill or kill" />
        <Metric label="Gas estimate" value={`${value.gasEstimate} units`} />
        <Metric label="Maximum gas at quote" value={`${formatCompactAtoms(BigInt(value.maximumGasCostWei), 18, 6)} MON`} />
        <Metric label="Kuru fee field" value={`${value.takerFeeBps} bps`} />
        <Metric label="Simulation block" value={value.blockNumber} />
      </div>
      <details><summary>Contract evidence</summary><div className="evidence-list compact-evidence"><div className="evidence-row"><span>Market</span><strong>{value.marketAddress}</strong></div><div className="evidence-row"><span>Implementation</span><strong>{value.implementationAddress}</strong></div><div className="evidence-row"><span>Code hash</span><strong>{value.implementationCodeHash}</strong></div><div className="evidence-row"><span>Failure conditions</span><strong>quote expiry, account/network change, insufficient MON or gas, proxy upgrade, stale book, inadequate full-fill liquidity, output below minimum</strong></div></div></details>
      <div className="execution-gate">
        <button className="button" type="button" onClick={onExecute} disabled={!EXECUTION_ENABLED}>{EXECUTION_ENABLED ? 'Revalidate and confirm in wallet' : 'Mainnet execution disabled'}</button>
        <span>{EXECUTION_ENABLED ? 'A fresh simulation runs again before the wallet opens.' : 'Owner approval and NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=true are both required.'}</span>
      </div>
      {executionMessage ? <div className="notice">{executionMessage}</div> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="review-metric"><span>{label}</span><strong>{value}</strong></div>;
}
