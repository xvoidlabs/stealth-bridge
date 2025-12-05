import { fetchQuote, Quote } from '@mayanfinance/swap-sdk';

export interface BridgeParams {
  fromChain: string;
  fromToken: string;
  toToken: string;
  amount: number;
  slippageBps?: number;
}

export async function getQuote(params: BridgeParams): Promise<Quote | null> {
  try {
    const quotes = await fetchQuote({
      amount: params.amount,
      fromChain: params.fromChain,
      fromToken: params.fromToken,
      toChain: 'solana',
      toToken: params.toToken,
      slippageBps: params.slippageBps ?? 300,
    });
    return quotes[0] ?? null;
  } catch (e) {
    console.error('Quote fetch failed:', e);
    return null;
  }
}

export function getMayanUrl(destinationAddress: string, fromChain?: string): string {
  const base = 'https://swap.mayan.finance/';
  const params = new URLSearchParams({
    destAddr: destinationAddress,
    toChain: 'solana',
  });
  if (fromChain) {
    params.set('fromChain', fromChain);
  }
  return `${base}?${params.toString()}`;
}

export const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: 'ETH' },
  { id: 'arbitrum', name: 'Arbitrum', icon: 'ARB' },
  { id: 'base', name: 'Base', icon: 'BASE' },
  { id: 'polygon', name: 'Polygon', icon: 'POLY' },
  { id: 'bsc', name: 'BNB Chain', icon: 'BSC' },
  { id: 'avalanche', name: 'Avalanche', icon: 'AVAX' },
  { id: 'optimism', name: 'Optimism', icon: 'OP' },
] as const;

