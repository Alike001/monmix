'use client';

import { useRef, useState } from 'react';
import type { Address, Hex } from 'viem';
import { useConnection, useWriteContract } from 'wagmi';
import {
  ERC20_APPROVAL_ABI,
  hasExactApprovalEvent,
  type UsdcAllowanceStatusDto,
  type UsdcRevocationPreparationDto,
} from '@monad-strategy/kuru-adapter';
import { formatCompactAtoms } from '@/lib/format';
import { publicClient } from '@/lib/public-client';
import { assertRevocationRevalidation } from '@/lib/execution-review';
import { beginJournalRecord, recordPreparedAction, updateJournalRecord, walletFailureStatus } from '@/lib/transaction-journal';
import { assertWalletExecutionContext } from '@/lib/wallet-state';
import { useNowSeconds } from '@/lib/use-now-seconds';
import { quoteFreshness } from '@/lib/allocation';

const EXECUTION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION === 'true';
type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'status'; value: UsdcAllowanceStatusDto } |
  { kind: 'prepared'; value: UsdcRevocationPreparationDto } | { kind: 'error'; message: string };

export function AllowanceRecovery({ account, onJournalChange }: { account: Address; onJournalChange: () => void }) {
  const connection = useConnection();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
  const nowSeconds = useNowSeconds();

  async function readStatus(): Promise<UsdcAllowanceStatusDto> {
    const response = await fetch(`/api/allowance?address=${account}`, { cache: 'no-store' });
    const payload = await response.json() as { ok: true; status: UsdcAllowanceStatusDto } | { ok: false; error: string };
    if (!response.ok || !payload.ok) throw new Error((payload as { ok: false; error: string }).error);
    return payload.status;
  }

  async function requestPreparation(): Promise<UsdcRevocationPreparationDto> {
    const response = await fetch('/api/preflight/revoke', { method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ account }) });
    const payload = await response.json() as { ok: true; preparation: UsdcRevocationPreparationDto } | { ok: false; error: string };
    if (!response.ok || !payload.ok) throw new Error((payload as { ok: false; error: string }).error);
    return payload.preparation;
  }

  async function check() {
    if (inFlight.current) return;
    inFlight.current = true; setState({ kind: 'loading' }); setMessage('');
    try { setState({ kind: 'status', value: await readStatus() }); }
    catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'Allowance read failed.' }); }
    finally { inFlight.current = false; }
  }

  async function prepare() {
    if (inFlight.current) return;
    inFlight.current = true; setState({ kind: 'loading' }); setMessage('');
    try {
      const value = await requestPreparation();
      recordPreparedAction(window.localStorage, { fingerprint: value.fingerprint, action: 'REVOKE_USDC', account: value.account, chainId: 143, marketAddress: value.spender, baseAmountAtoms: '0', minimumQuoteAtoms: '0', approvalAmountAtoms: '0', approvalSpender: value.spender });
      onJournalChange(); setState({ kind: 'prepared', value });
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'Revocation preparation failed.' }); }
    finally { inFlight.current = false; }
  }

  async function confirm() {
    if (!EXECUTION_ENABLED || state.kind !== 'prepared' || inFlight.current) return;
    if (BigInt(state.value.expiresAtSeconds) <= BigInt(Math.floor(Date.now() / 1000))) { setMessage('This revocation review expired. Prepare it again.'); return; }
    inFlight.current = true; let id: string | undefined; let hash: Hex | undefined;
    try {
      const fresh = await requestPreparation();
      assertWalletExecutionContext(connection, fresh);
      assertRevocationRevalidation(state.value, fresh);
      const journal = beginJournalRecord(window.localStorage, { fingerprint: fresh.fingerprint, action: 'REVOKE_USDC', account: fresh.account, chainId: 143, marketAddress: fresh.spender, baseAmountAtoms: '0', minimumQuoteAtoms: '0', approvalAmountAtoms: '0', approvalSpender: fresh.spender });
      id = journal.id; onJournalChange(); setMessage('Awaiting a separate wallet confirmation to set the Kuru USDC allowance to zero.');
      hash = await writeContractAsync({ account: fresh.account, chainId: 143, address: fresh.tokenAddress, abi: ERC20_APPROVAL_ABI, functionName: 'approve', args: [fresh.spender, 0n] });
      updateJournalRecord(window.localStorage, id, { status: 'BROADCAST', hash }); onJournalChange();
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      if (receipt.status === 'reverted') { updateJournalRecord(window.localStorage, id, { status: 'REVERTED', blockNumber: receipt.blockNumber.toString() }); setMessage('The revocation reverted. No retry was sent.'); onJournalChange(); return; }
      if (!hasExactApprovalEvent(receipt.logs, fresh.account, fresh.spender, 0n)) { updateJournalRecord(window.localStorage, id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), error: 'Receipt succeeded without an exact zero-value Approval event.' }); setMessage('The receipt did not prove a zero allowance.'); onJournalChange(); return; }
      updateJournalRecord(window.localStorage, id, { status: 'CONFIRMED', blockNumber: receipt.blockNumber.toString(), networkFeeWei: (receipt.gasUsed * receipt.effectiveGasPrice).toString() });
      setState({ kind: 'status', value: { chainId: 143, account: fresh.account, tokenAddress: fresh.tokenAddress, spender: fresh.spender, allowanceAtoms: '0', blockNumber: receipt.blockNumber.toString(), observedAtSeconds: Math.floor(Date.now() / 1000).toString() } });
      setMessage('Zero allowance confirmed. No trade was sent.'); onJournalChange();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Revocation request failed.';
      if (id) updateJournalRecord(window.localStorage, id, { status: hash ? 'UNRESOLVED' : walletFailureStatus(error), ...(hash ? { hash } : {}), error: text });
      setMessage(text); onJournalChange();
    } finally { inFlight.current = false; }
  }

  const freshness = state.kind === 'prepared' ? quoteFreshness(BigInt(state.value.expiresAtSeconds), nowSeconds) : null;
  return <section className="card allowance-recovery"><div><span className="eyebrow">USDC permission</span><h2>Check what Kuru can still spend</h2><p>An approval can remain after an abandoned or failed buy. This reads the live token allowance; it is not inferred from the journal.</p></div>
    {state.kind === 'idle' ? <button className="button small secondary" type="button" onClick={check}>Check residual allowance</button> : null}
    {state.kind === 'loading' ? <span>Reading verified USDC allowance…</span> : null}
    {state.kind === 'error' ? <div className="notice danger">{state.message}</div> : null}
    {state.kind === 'status' ? <div className="allowance-status"><span>Current market allowance</span><strong>{formatCompactAtoms(BigInt(state.value.allowanceAtoms), 6, 6)} USDC</strong>{BigInt(state.value.allowanceAtoms) > 0n ? <><p>Kuru&apos;s verified market proxy can still transfer up to this amount. Revocation is a separate token transaction and never sends a trade.</p><button className="button small secondary" type="button" onClick={prepare}>Prepare zero-allowance revocation</button></> : <p>No residual USDC spending permission is present for this Kuru market.</p>}</div> : null}
    {state.kind === 'prepared' ? <div className="allowance-status"><span>Current allowance</span><strong>{formatCompactAtoms(BigInt(state.value.allowanceAtoms), 6, 6)} USDC → 0</strong><p>Exact call: USDC <code>approve(Kuru market, 0)</code>. Estimated fee ceiling: {formatCompactAtoms(BigInt(state.value.maximumGasCostWei), 18, 6)} MON.</p><details><summary>Revocation evidence</summary><div className="evidence-list compact-evidence"><div className="evidence-row"><span>USDC</span><strong>{state.value.tokenAddress}</strong></div><div className="evidence-row"><span>Spender</span><strong>{state.value.spender}</strong></div><div className="evidence-row"><span>Target allowance</span><strong>0 USDC</strong></div></div></details><button className="button small" type="button" disabled={!EXECUTION_ENABLED || freshness !== 'FRESH'} onClick={confirm}>{EXECUTION_ENABLED ? freshness === 'FRESH' ? 'Confirm zero allowance in wallet' : 'Prepare again' : 'Mainnet execution disabled'}</button></div> : null}
    {message ? <div className="notice">{message}</div> : null}
  </section>;
}
