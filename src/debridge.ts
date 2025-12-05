import { EVMWallet } from './evm-wallet';

const DEBRIDGE_API = 'https://api.dln.trade/v1.0';

export interface DeBridgeQuote {
  estimation: {
    srcChainTokenIn: {
      amount: string;
      symbol: string;
      decimals: number;
    };
    srcChainTokenOut: {
      amount: string;
      symbol: string;
    };
    dstChainTokenOut: {
      amount: string;
      symbol: string;
      decimals: number;
      recommendedAmount: string;
    };
  };
  tx: {
    to: string;
    data: string;
    value: string;
  };
  orderId: string;
  fixFee: string;
  percentFee: string;
}

export interface QuoteParams {
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  amount: string;
  dstAddress: string;
  srcAddress: string;
}

// Native token addresses - deBridge uses this format
export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';
export const NATIVE_TOKEN_ALT = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // Alternative format
export const SOLANA_CHAIN_ID = 7565164;
export const SOLANA_NATIVE_SOL = 'So11111111111111111111111111111111111111112'; // Wrapped SOL mint

export async function getQuote(params: QuoteParams): Promise<DeBridgeQuote | null> {
  try {
    const url = new URL(`${DEBRIDGE_API}/dln/order/quote`);
    url.searchParams.set('srcChainId', params.srcChainId.toString());
    url.searchParams.set('srcChainTokenIn', params.srcTokenAddress);
    url.searchParams.set('srcChainTokenInAmount', params.amount);
    url.searchParams.set('dstChainId', params.dstChainId.toString());
    url.searchParams.set('dstChainTokenOut', params.dstTokenAddress);
    url.searchParams.set('dstChainTokenOutRecipient', params.dstAddress);
    url.searchParams.set('srcChainOrderAuthorityAddress', params.srcAddress);
    url.searchParams.set('dstChainOrderAuthorityAddress', params.dstAddress);
    url.searchParams.set('prependOperatingExpenses', 'true');

    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.text();
      console.error('Quote error:', error);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error('Failed to get quote:', e);
    return null;
  }
}

export async function createTransaction(params: QuoteParams): Promise<DeBridgeQuote | null> {
  try {
    const url = new URL(`${DEBRIDGE_API}/dln/order/create-tx`);
    url.searchParams.set('srcChainId', params.srcChainId.toString());
    url.searchParams.set('srcChainTokenIn', params.srcTokenAddress);
    url.searchParams.set('srcChainTokenInAmount', params.amount);
    url.searchParams.set('dstChainId', params.dstChainId.toString());
    url.searchParams.set('dstChainTokenOut', params.dstTokenAddress);
    url.searchParams.set('dstChainTokenOutRecipient', params.dstAddress);
    url.searchParams.set('srcChainOrderAuthorityAddress', params.srcAddress);
    url.searchParams.set('dstChainOrderAuthorityAddress', params.dstAddress);
    url.searchParams.set('prependOperatingExpenses', 'true');
    url.searchParams.set('referralCode', '0');

    console.log('Creating transaction with URL:', url.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.text();
      console.error('Create tx error response:', error);
      return null;
    }

    const data = await response.json();
    console.log('Create tx response:', {
      orderId: data.orderId,
      hasTx: !!data.tx,
      txTo: data.tx?.to,
      txValue: data.tx?.value,
    });
    return data;
  } catch (e) {
    console.error('Failed to create transaction:', e);
    return null;
  }
}

export async function executeBridge(
  wallet: EVMWallet,
  quote: DeBridgeQuote
): Promise<string> {
  console.log('Executing bridge with tx:', {
    to: quote.tx.to,
    data: quote.tx.data?.slice(0, 100) + '...',
    value: quote.tx.value,
  });

  try {
    // Send raw transaction request through MetaMask
    const txHash = await window.ethereum!.request({
      method: 'eth_sendTransaction',
      params: [{
        from: wallet.address,
        to: quote.tx.to,
        data: quote.tx.data,
        value: '0x' + BigInt(quote.tx.value || '0').toString(16),
      }],
    }) as string;

    console.log('Transaction sent:', txHash);

    // Wait for confirmation
    const receipt = await wallet.provider.waitForTransaction(txHash);
    if (!receipt || receipt.status === 0) {
      throw new Error('Transaction failed');
    }
    
    return txHash;
  } catch (e: unknown) {
    console.error('Bridge execution error:', e);
    const err = e as { code?: number | string; message?: string; reason?: string };
    if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
      throw new Error('Transaction rejected by user');
    }
    if (err.reason) {
      throw new Error(err.reason);
    }
    if (err.message) {
      throw new Error(err.message);
    }
    throw e;
  }
}

export function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    56: 'https://bscscan.com/tx/',
    137: 'https://polygonscan.com/tx/',
    42161: 'https://arbiscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    43114: 'https://snowtrace.io/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
  };
  return (explorers[chainId] || 'https://etherscan.io/tx/') + txHash;
}

export function formatAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount) / Math.pow(10, decimals);
  return num.toFixed(6);
}

export function parseAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount) * Math.pow(10, decimals);
  return Math.floor(num).toString();
}

export async function checkOrderStatus(orderId: string): Promise<string> {
  try {
    const url = `${DEBRIDGE_API}/dln/order/${orderId}/status`;
    const response = await fetch(url);
    if (!response.ok) return 'unknown';
    const data = await response.json();
    return data.status || 'unknown';
  } catch {
    return 'unknown';
  }
}

