'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain, type Connector } from 'wagmi';
import { MONAD_MAINNET_CHAIN_ID } from '@monad-strategy/kuru-adapter';
import { selectableWalletConnectors, walletNetworkName } from '@/lib/wallet-state';
import { useVerifiedWallet } from './wallet-readiness-provider';

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function walletName(connector: { name: string }) {
  return connector.name === 'Injected' ? 'Browser wallet' : connector.name;
}

function readinessLabel(readiness: ReturnType<typeof useVerifiedWallet>['readiness']) {
  if (readiness === 'READY') return 'READY';
  if (readiness === 'WRONG_NETWORK') return 'WRONG NETWORK';
  if (readiness === 'PROVIDER_MISMATCH') return 'WALLET MISMATCH';
  if (readiness === 'VERIFYING') return 'VERIFYING';
  return 'NOT CONNECTED';
}

export function ConnectWallet() {
  const connection = useConnection();
  const wallet = useVerifiedWallet();
  const connectors = useConnectors();
  const { connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchError, isPending: isSwitching, reset: resetSwitch } = useSwitchChain();
  const candidates = useMemo(() => selectableWalletConnectors(connectors), [connectors]);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [connectingUid, setConnectingUid] = useState<string>();
  const closeButton = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const connected = connection.status === 'connected' && Boolean(connection.address);
  const identity = wallet.connectorName ? walletName({ name: wallet.connectorName }) : 'Selected wallet';
  const network = walletNetworkName(wallet.providerChainId);
  const chainLabel = wallet.providerChainId === undefined ? 'checking' : String(wallet.providerChainId);
  const status = readinessLabel(wallet.readiness);

  const chooseWallet = (connector: Connector) => {
    setConnectingUid(connector.uid);
    connect({ connector }, { onSettled: () => setConnectingUid(undefined) });
  };

  return (
    <div className="wallet-entry">
      <button
        className={`wallet-trigger ${wallet.readiness === 'READY' ? 'ready' : ''} ${connected && wallet.readiness !== 'READY' ? 'attention' : ''}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className={`status-dot ${wallet.readiness === 'READY' ? 'live' : ''}`} aria-hidden="true" />
        <span className="wallet-trigger-copy">
          <strong>{connected && connection.address ? `${identity} · ${shortAddress(connection.address)}` : 'Connect wallet'}</strong>
          <small>{connected ? `${network} · chain ${chainLabel}` : 'Choose your provider'}</small>
        </span>
        <span className="wallet-trigger-status">{status}</span>
      </button>

      {open && typeof document !== 'undefined' ? createPortal((
        <div className="wallet-modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
          <section className="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-dialog-title">
            <div className="wallet-modal-head">
              <div>
                <span className="eyebrow">Wallet access</span>
                <h2 id="wallet-dialog-title">{connected ? 'Your connected wallet' : 'Choose a wallet'}</h2>
              </div>
              <button ref={closeButton} className="wallet-modal-close" type="button" aria-label="Close wallet dialog" onClick={() => setOpen(false)}>×</button>
            </div>

            {connected && connection.address ? (
              <>
                <div className={`wallet-readiness ${wallet.readiness === 'READY' ? 'ready' : 'attention'}`} aria-live="polite">
                  <span className={`status-dot ${wallet.readiness === 'READY' ? 'live' : ''}`} aria-hidden="true" />
                  <div><strong>{status}</strong><small>{wallet.readiness === 'READY' ? 'This wallet is verified for Monad portfolio reads.' : wallet.message ?? 'This address is connected, but it is not ready for Monad trading.'}</small></div>
                </div>
                <dl className="wallet-facts">
                  <div><dt>Selected wallet</dt><dd>{identity}</dd></div>
                  <div><dt>Connected account</dt><dd className="mono">{connection.address}</dd></div>
                  <div><dt>Wallet network</dt><dd>{network}</dd></div>
                  <div><dt>Provider chain ID</dt><dd>{chainLabel}</dd></div>
                  <div><dt>Required network</dt><dd>Monad Mainnet · 143</dd></div>
                </dl>
                {wallet.readiness === 'WRONG_NETWORK' ? (
                  <div className="wallet-action-block">
                    <p>MonMix will not read this account as a Monad portfolio until the selected provider reports chain 143.</p>
                    <button className="button" type="button" disabled={isSwitching} onClick={() => { resetSwitch(); switchChain({ chainId: MONAD_MAINNET_CHAIN_ID }); }}>
                      {isSwitching ? 'Switching…' : 'Switch to Monad Mainnet'}
                    </button>
                    {switchError ? <small className="form-error" role="alert">Switch was not completed: {switchError.message}</small> : null}
                  </div>
                ) : null}
                {wallet.readiness === 'PROVIDER_MISMATCH' ? <div className="notice danger">The provider account or network no longer matches the connected session. Disconnect and reconnect the wallet you intend to use.</div> : null}
                <div className="wallet-modal-actions">
                  <button className="button secondary" type="button" onClick={() => { disconnect(); setOpen(false); }}>Disconnect wallet</button>
                  {wallet.readiness === 'READY' ? <button className="button" type="button" onClick={() => setOpen(false)}>Done</button> : null}
                </div>
              </>
            ) : (
              <>
                <p className="wallet-intro">Select the extension you intend to use. MonMix verifies that provider’s account and network directly before reading Monad balances.</p>
                <div className="wallet-options">
                  {candidates.map((connector) => {
                    const name = walletName(connector);
                    const detected = available[connector.uid];
                    return (
                      <button className="wallet-option" key={connector.uid} type="button" disabled={!detected || isPending} onClick={() => chooseWallet(connector as Connector)}>
                        <span className="wallet-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
                        <span><strong>{name}</strong><small>{connector.rdns ? String(connector.rdns) : 'Injected browser provider'}</small></span>
                        <b>{connectingUid === connector.uid && isPending ? 'Connecting…' : detected ? 'Connect' : 'Not detected'}</b>
                      </button>
                    );
                  })}
                </div>
                {candidates.length === 0 ? <div className="notice">No compatible injected wallet was detected. Install or enable a MetaMask-compatible wallet, then reload this page.</div> : null}
                {connectError ? <small className="form-error" role="alert">Connection was not completed: {connectError.message}</small> : null}
              </>
            )}

            <p className="wallet-safety">Connecting is read-only. Public MonMix builds keep execution disabled and cannot request a trade, token approval, or transaction signature.</p>
          </section>
        </div>
      ), document.body) : null}
    </div>
  );
}
