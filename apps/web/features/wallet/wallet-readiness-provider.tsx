'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Address } from 'viem';
import { useConnection } from 'wagmi';
import { MONAD_MAINNET_CHAIN_ID } from '@monad-strategy/kuru-adapter';
import {
  getWalletReadiness,
  isEip1193Provider,
  readProviderWalletState,
  type Eip1193Provider,
  type ProviderWalletState,
  type WalletReadiness,
} from '@/lib/wallet-state';

export type VerifiedWallet = {
  readiness: WalletReadiness;
  address?: Address | undefined;
  providerChainId?: number | undefined;
  connectorName?: string | undefined;
  connectorUid?: string | undefined;
  message?: string | undefined;
};

const WalletReadinessContext = createContext<VerifiedWallet>({ readiness: 'DISCONNECTED' });

export function WalletReadinessProvider({ children }: { children: ReactNode }) {
  const connection = useConnection();
  const connector = connection.status === 'connected' ? connection.connector : undefined;
  const connectionKey = connection.status === 'connected' && connection.address && connector
    ? `${connector.uid}:${connection.address}:${connection.chainId}`
    : '';
  const [verification, setVerification] = useState<{ key: string; provider?: ProviderWalletState; error?: string }>();

  useEffect(() => {
    let active = true;
    let provider: Eip1193Provider | undefined;
    let verification = 0;

    if (connection.status !== 'connected' || !connection.address || !connector) return () => { active = false; };

    const verify = async () => {
      const current = ++verification;
      try {
        const next = await readProviderWalletState(connector);
        if (active && current === verification) setVerification({ key: connectionKey, provider: next });
      } catch (error) {
        if (active && current === verification) {
          setVerification({ key: connectionKey, error: error instanceof Error ? error.message : 'The selected wallet could not be verified.' });
        }
      }
    };
    const changed = () => {
      setVerification({ key: connectionKey });
      void verify();
    };

    void connector.getProvider().then((value) => {
      if (!active) return;
      if (!isEip1193Provider(value)) {
        setVerification({ key: connectionKey, error: 'The selected wallet provider is unavailable.' });
        return;
      }
      provider = value;
      provider.on?.('accountsChanged', changed);
      provider.on?.('chainChanged', changed);
      provider.on?.('disconnect', changed);
      void verify();
    }).catch((error: unknown) => {
      if (active) setVerification({ key: connectionKey, error: error instanceof Error ? error.message : 'The selected wallet provider is unavailable.' });
    });

    return () => {
      active = false;
      verification += 1;
      provider?.removeListener?.('accountsChanged', changed);
      provider?.removeListener?.('chainChanged', changed);
      provider?.removeListener?.('disconnect', changed);
    };
  }, [connection.address, connection.chainId, connection.status, connectionKey, connector]);

  const value = useMemo<VerifiedWallet>(() => {
    const currentVerification = verification?.key === connectionKey ? verification : undefined;
    const providerState = currentVerification?.provider;
    const verificationError = currentVerification?.error ?? '';
    const readiness = verificationError
      ? 'PROVIDER_MISMATCH'
      : getWalletReadiness({
          status: connection.status,
          wagmiAddress: connection.address,
          wagmiChainId: connection.chainId,
          provider: providerState,
          requiredChainId: MONAD_MAINNET_CHAIN_ID,
        });
    return {
      readiness,
      address: connection.address,
      providerChainId: providerState?.chainId,
      connectorName: connector?.name,
      connectorUid: connector?.uid,
      message: verificationError || (readiness === 'PROVIDER_MISMATCH'
        ? 'The selected wallet provider does not match the connected account or network. Disconnect and reconnect that wallet.'
        : undefined),
    };
  }, [connection.address, connection.chainId, connection.status, connectionKey, connector?.name, connector?.uid, verification]);

  return <WalletReadinessContext.Provider value={value}>{children}</WalletReadinessContext.Provider>;
}

export function useVerifiedWallet(): VerifiedWallet {
  return useContext(WalletReadinessContext);
}
