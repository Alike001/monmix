'use client';

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

  const connector = connectors[0];
  return (
    <div className={`wallet-control ${compact ? 'compact' : ''}`}>
      <button
        className="button small"
        type="button"
        disabled={!connector || isPending}
        onClick={() => connector && connect({ connector, chainId: MONAD_MAINNET_CHAIN_ID })}
      >
        {isPending ? 'Connecting…' : 'Connect wallet'}
      </button>
      {connectError ? <small>{connectError.message}</small> : null}
    </div>
  );
}
