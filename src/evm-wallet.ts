import { BrowserProvider, JsonRpcSigner, formatEther, parseEther } from 'ethers';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export interface EVMWallet {
  address: string;
  chainId: number;
  provider: BrowserProvider;
  signer: JsonRpcSigner;
}

export const SUPPORTED_CHAINS: Record<number, { 
  name: string; 
  icon: string; 
  rpc: string;
  currency: { name: string; symbol: string; decimals: number };
  explorer: string;
}> = {
  1: { 
    name: 'Ethereum', 
    icon: 'ETH', 
    rpc: 'https://eth.llamarpc.com',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorer: 'https://etherscan.io'
  },
  56: { 
    name: 'BNB Chain', 
    icon: 'BSC', 
    rpc: 'https://bsc-dataseed.binance.org',
    currency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    explorer: 'https://bscscan.com'
  },
  137: { 
    name: 'Polygon', 
    icon: 'POLY', 
    rpc: 'https://polygon-rpc.com',
    currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    explorer: 'https://polygonscan.com'
  },
  42161: { 
    name: 'Arbitrum', 
    icon: 'ARB', 
    rpc: 'https://arb1.arbitrum.io/rpc',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorer: 'https://arbiscan.io'
  },
  8453: { 
    name: 'Base', 
    icon: 'BASE', 
    rpc: 'https://mainnet.base.org',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorer: 'https://basescan.org'
  },
  43114: { 
    name: 'Avalanche', 
    icon: 'AVAX', 
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    currency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    explorer: 'https://snowtrace.io'
  },
  10: { 
    name: 'Optimism', 
    icon: 'OP', 
    rpc: 'https://mainnet.optimism.io',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorer: 'https://optimistic.etherscan.io'
  },
};

let currentWallet: EVMWallet | null = null;

export function isMetaMaskInstalled(): boolean {
  return typeof window.ethereum !== 'undefined' && !!window.ethereum.isMetaMask;
}

export async function connectWallet(): Promise<EVMWallet> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  const provider = new BrowserProvider(window.ethereum);
  const accounts = (await window.ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found');
  }

  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  currentWallet = {
    address: accounts[0],
    chainId: Number(network.chainId),
    provider,
    signer,
  };

  return currentWallet;
}

export async function switchChain(chainId: number): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask not installed');

  const hexChainId = '0x' + chainId.toString(16);

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 4902) {
      const chain = SUPPORTED_CHAINS[chainId];
      if (!chain) throw new Error('Unsupported chain');

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexChainId,
            chainName: chain.name,
            rpcUrls: [chain.rpc],
            nativeCurrency: chain.currency,
            blockExplorerUrls: [chain.explorer],
          },
        ],
      });
    } else if (err.code === 4001) {
      // User rejected - don't throw, just return
      throw new Error('User rejected chain switch');
    } else {
      throw error;
    }
  }

  if (currentWallet) {
    currentWallet.chainId = chainId;
    currentWallet.provider = new BrowserProvider(window.ethereum);
    currentWallet.signer = await currentWallet.provider.getSigner();
  }
}

export async function getBalance(address?: string): Promise<string> {
  if (!currentWallet) throw new Error('Wallet not connected');
  const addr = address || currentWallet.address;
  const balance = await currentWallet.provider.getBalance(addr);
  return formatEther(balance);
}

export function getCurrentWallet(): EVMWallet | null {
  return currentWallet;
}

export function disconnectWallet(): void {
  currentWallet = null;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function onAccountsChanged(callback: (accounts: string[]) => void): void {
  window.ethereum?.on('accountsChanged', callback as (...args: unknown[]) => void);
}

export function onChainChanged(callback: (chainId: string) => void): void {
  window.ethereum?.on('chainChanged', callback as (...args: unknown[]) => void);
}

export { parseEther, formatEther };

