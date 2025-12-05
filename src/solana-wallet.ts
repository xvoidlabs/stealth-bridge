import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

declare global {
  interface Window {
    solana?: PhantomWallet;
    phantom?: { solana?: PhantomWallet };
  }
}

interface PhantomWallet {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  isConnected?: boolean;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
}

export interface SolanaWallet {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
}

let currentWallet: SolanaWallet | null = null;

export function getPhantom(): PhantomWallet | null {
  if (window.phantom?.solana?.isPhantom) {
    return window.phantom.solana;
  }
  if (window.solana?.isPhantom) {
    return window.solana;
  }
  return null;
}

export function isPhantomInstalled(): boolean {
  return !!getPhantom();
}

export async function connectWallet(): Promise<SolanaWallet> {
  const phantom = getPhantom();
  if (!phantom) {
    throw new Error('Phantom wallet not installed');
  }

  const response = await phantom.connect();
  
  currentWallet = {
    publicKey: response.publicKey,
    signTransaction: phantom.signTransaction.bind(phantom),
  };

  return currentWallet;
}

export function getCurrentWallet(): SolanaWallet | null {
  return currentWallet;
}

export function disconnectWallet(): void {
  const phantom = getPhantom();
  if (phantom) {
    phantom.disconnect();
  }
  currentWallet = null;
}

export function formatAddress(address: string | PublicKey): string {
  const str = typeof address === 'string' ? address : address.toBase58();
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

