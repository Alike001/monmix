'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain, type Connector } from 'wagmi';
import { MONAD_MAINNET_CHAIN_ID } from '@monad-strategy/kuru-adapter';
import { selectableWalletConnectors } from '@/lib/wallet-state';
import { useVerifiedWallet } from './wallet-readiness-provider';

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function walletName(connector: { name: string }) {
  return connector.name === 'Injected' ? 'wallet' : connector.name;
}

export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const connection = useConnection();
  const wallet = useVerifiedWallet();
  const connectors = useConnectors();
  const { connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchError, isPending: isSwitching, reset: resetSwitch } = useSwitchChain();
  const candidates = useMemo(() => selectableWalletConnectors(connectors), [connectors]);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [selectedUid, setSelectedUid] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all(candidates.map(async (connector) => {
      try {
        return [connector.uid, Boolean(await connector.getProvider())] as const;
      } catch {
        return [connector.uid, false] as const;
      }
    })).then((entries) => { if (active) setAvailable(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [candidates]);

  const effectiveSelectedUid = candidates.length === 1
    ? candidates[0]!.uid
    : candidates.some((connector) => connector.uid === selectedUid) ? selectedUid : '';
  const selected = candidates.find((connector) => connector.uid === effectiveSelectedUid);

  if (connection.status === 'connected' && connection.address) {
    const identity = wallet.connectorName ?? connection.connector.name;
    if (wallet.readiness === 'READY') {
      return (
        <div className={`wallet-control ${compact ? 'compact' : ''}`}>
          <span className="status-dot live" />
          <span className="wallet-identity">{identity}</span>
          <span>{shortAddress(connection.address)}</span>
          {!compact ? <small className="wallet-ready">Wallet ready on Monad</small> : null}
          <button className="text-button" type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      );
    }

    if (wallet.readiness === 'WRONG_NETWORK') {
      return (
        <div className={`wallet-control wrong ${compact ? 'compact' : ''}`}>
          <span><strong>WRONG NETWORK</strong> · {identity} · {shortAddress(connection.address)}</span>
          <button
            className="button small"
            type="button"
            disabled={isSwitching}
            onClick={() => { resetSwitch(); switchChain({ chainId: MONAD_MAINNET_CHAIN_ID }); }}
          >
            {isSwitching ? 'Switching…' : 'Switch to Monad'}
          </button>
          {!compact ? <small>Address connected, but this selected wallet is on chain {wallet.providerChainId ?? 'unknown'} and is not ready to trade.</small> : null}
          {switchError ? <small>{switchError.message}</small> : null}
        </div>
      );
    }

    if (wallet.readiness === 'PROVIDER_MISMATCH') {
      return (
        <div className={`wallet-control wrong ${compact ? 'compact' : ''}`}>
          <span><strong>WALLET MISMATCH</strong> · {identity} · {shortAddress(connection.address)}</span>
          <button className="text-button" type="button" onClick={() => disconnect()}>Disconnect</button>
          {!compact ? <small>{wallet.message}</small> : null}
        </div>
      );
    }

    return (
      <div className={`wallet-control ${compact ? 'compact' : ''}`}>
        <span className="status-dot" />
        <span>{identity} · {shortAddress(connection.address)}</span>
        {!compact ? <small className="wallet-checking">Address connected. Verifying the selected wallet account and network…</small> : null}
        <button className="text-button" type="button" onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div className={`wallet-control wallet-picker ${compact ? 'compact' : ''}`}>
      {candidates.length > 1 ? (
        <label className="wallet-select-label">
          <span>Choose wallet</span>
          <select
            aria-label="Choose injected wallet"
            value={effectiveSelectedUid}
            disabled={isPending}
            onChange={(event) => setSelectedUid(event.target.value)}
          >
            <option value="">Select a wallet…</option>
            {candidates.map((connector) => <option key={connector.uid} value={connector.uid}>{connector.name}</option>)}
          </select>
        </label>
      ) : candidates.length === 1 ? <span className="wallet-choice">{candidates[0]!.name === 'Injected' ? 'Browser wallet' : candidates[0]!.name}</span> : null}
      <button
        className="button small"
        type="button"
        disabled={!selected || !available[selected.uid] || isPending}
        onClick={() => selected && connect({ connector: selected as Connector })}
      >
        {isPending ? 'Connecting…' : selected ? `Connect ${walletName(selected)}` : candidates.length > 1 ? 'Choose a wallet' : 'Wallet not detected'}
      </button>
      {candidates.length > 1 && !selected && !compact ? <small>Select the extension you intend to use. MonMix will verify that provider directly.</small> : null}
      {candidates.length === 0 && !compact ? <small>Open this page in a browser with a MetaMask-compatible injected wallet.</small> : null}
      {connectError ? <small>{connectError.message}</small> : null}
    </div>
  );
}
