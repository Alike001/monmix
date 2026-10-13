'use client';

import { useEffect, useState } from 'react';
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from 'wagmi';
import { MONAD_MAINNET_CHAIN_ID } from '@monad-strategy/kuru-adapter';
import { getWalletReadiness } from '@/lib/wallet-state';

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const connection = useConnection();
  const connectors = useConnectors();
  const { connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchError, isPending: isSwitching } = useSwitchChain();
  const [providerReady, setProviderReady] = useState(false);
  const connector = connectors[0];
  useEffect(() => {
    let active = true;
    void connector?.getProvider().then((provider) => { if (active) setProviderReady(Boolean(provider)); });
    return () => { active = false; };
  }, [connector]);
  const readiness = getWalletReadiness(
    connection.status,
    connection.chainId,
    MONAD_MAINNET_CHAIN_ID,
  );

  if (readiness === 'READY' && connection.address) {
    return (
      <div className={`wallet-control ${compact ? 'compact' : ''}`}>
        <span className="status-dot live" />
        <span>{shortAddress(connection.address)}</span>
        <button className="text-button" type="button" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  if (readiness === 'WRONG_NETWORK') {
    return (
      <div className={`wallet-control wrong ${compact ? 'compact' : ''}`}>
        <span>Wrong network</span>
        <button
          className="button small"
          type="button"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: MONAD_MAINNET_CHAIN_ID })}
        >
          {isSwitching ? 'Switching…' : 'Switch to Monad'}
        </button>
        {switchError ? <small>{switchError.message}</small> : null}
      </div>
    );
  }

  return (
    <div className={`wallet-control ${compact ? 'compact' : ''}`}>
      <button
        className="button small"
        type="button"
        disabled={!connector || !providerReady || isPending}
        onClick={() => connector && connect({ connector, chainId: MONAD_MAINNET_CHAIN_ID })}
      >
        {isPending ? 'Connecting…' : providerReady ? 'Connect wallet' : 'Wallet not detected'}
      </button>
      {!providerReady && !compact ? <small>Open this page in a browser with a MetaMask-compatible injected wallet.</small> : null}
      {connectError ? <small>{connectError.message}</small> : null}
    </div>
  );
}
