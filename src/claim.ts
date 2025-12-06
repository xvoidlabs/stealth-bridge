import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  createCloseAccountInstruction,
} from '@solana/spl-token';

// RPC Configuration - uses environment variables or fallback to public RPCs
// Extract API key if full URL is provided
function extractHeliusKey(input: string): string {
  if (!input) return '';
  // If it's a full URL, extract the api-key parameter
  if (input.includes('helius-rpc.com')) {
    const match = input.match(/api-key=([a-f0-9-]+)/i);
    return match ? match[1] : '';
  }
  return input;
}

const HELIUS_KEY = extractHeliusKey(import.meta.env.VITE_HELIUS_API_KEY || '');

// Public RPCs that support browser CORS
const PUBLIC_MAINNET_RPCS = [
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://api.mainnet-beta.solana.com',
];

const PUBLIC_DEVNET_RPCS = [
  'https://rpc.ankr.com/solana_devnet',
  'https://api.devnet.solana.com',
];

const MAINNET_RPCS = HELIUS_KEY 
  ? [`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, ...PUBLIC_MAINNET_RPCS]
  : PUBLIC_MAINNET_RPCS;

const DEVNET_RPCS = HELIUS_KEY
  ? [`https://devnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, ...PUBLIC_DEVNET_RPCS]
  : PUBLIC_DEVNET_RPCS;

let useMainnet = !window.location.search.includes('devnet'); // Add ?devnet to URL for testing
let rpcIndex = 0;
let lastRpcSwitch = 0;

function getConnection(): Connection {
  const rpcs = useMainnet ? MAINNET_RPCS : DEVNET_RPCS;
  const rpc = rpcs[rpcIndex % rpcs.length];
  console.debug('Using RPC:', rpc);
  return new Connection(rpc, 'confirmed');
}

// Switch to next RPC on error (with cooldown to prevent rapid switching)
export function rotateRpc(): void {
  const now = Date.now();
  if (now - lastRpcSwitch > 2000) { // 2 second cooldown
    rpcIndex++;
    lastRpcSwitch = now;
    const rpcs = useMainnet ? MAINNET_RPCS : DEVNET_RPCS;
    console.log('Switched to RPC:', rpcs[rpcIndex % rpcs.length]);
  }
}

export function setNetwork(mainnet: boolean) {
  useMainnet = mainnet;
}

export function isMainnet(): boolean {
  return useMainnet;
}

export interface TokenBalance {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  symbol?: string;
}

export interface Balances {
  sol: number;
  tokens: TokenBalance[];
}

export async function getBalances(address: PublicKey): Promise<Balances> {
  const rpcs = useMainnet ? MAINNET_RPCS : DEVNET_RPCS;
  let lastError: Error | null = null;

  // Try each RPC until one works
  for (let i = 0; i < rpcs.length; i++) {
    const conn = getConnection();
    
    try {
      const [solBalance, tokenAccounts] = await Promise.all([
        conn.getBalance(address),
        conn.getParsedTokenAccountsByOwner(address, { programId: TOKEN_PROGRAM_ID }),
      ]);

      const tokens: TokenBalance[] = tokenAccounts.value
        .map(({ account }) => {
          const info = account.data.parsed.info;
          return {
            mint: info.mint,
            amount: info.tokenAmount.amount,
            decimals: info.tokenAmount.decimals,
            uiAmount: info.tokenAmount.uiAmount ?? 0,
          };
        })
        .filter((t) => t.uiAmount > 0);

      return {
        sol: solBalance / LAMPORTS_PER_SOL,
        tokens,
      };
    } catch (e) {
      lastError = e as Error;
      console.warn('RPC failed, trying next:', e);
      rotateRpc();
    }
  }

  throw lastError || new Error('All RPCs failed');
}

export interface ClaimOptions {
  feePayer?: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  };
}

export interface SplitDestination {
  address: PublicKey;
  percentage: number; // 0-100
}

export async function claimAll(
  disposable: Keypair,
  destination: PublicKey,
  options?: ClaimOptions
): Promise<string> {
  const conn = getConnection();
  const feePayer = options?.feePayer;
  
  // Debug: Log what we're looking for
  console.log('Claiming from:', disposable.publicKey.toBase58());
  console.log('To destination:', destination.toBase58());
  console.log('Network:', useMainnet ? 'MAINNET' : 'DEVNET');
  console.log('Fee payer:', feePayer ? feePayer.publicKey.toBase58() : 'disposable');
  
  const tx = new Transaction();

  // Get SOL balance first
  const solBalance = await conn.getBalance(disposable.publicKey);
  console.log('SOL balance:', solBalance / LAMPORTS_PER_SOL);

  // Get all token accounts
  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(
    disposable.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  console.log('Token accounts found:', tokenAccounts.value.length);

  // wSOL mint address
  const WSOL_MINT = 'So11111111111111111111111111111111111111112';
  
  for (const { account, pubkey } of tokenAccounts.value) {
    const info = account.data.parsed.info;
    const mint = new PublicKey(info.mint);
    const amount = BigInt(info.tokenAmount.amount);
    const decimals = info.tokenAmount.decimals;

    console.log('Token:', mint.toBase58(), 'Amount:', info.tokenAmount.uiAmount);

    if (amount === 0n) continue;

    // Special handling for wSOL - unwrap to native SOL instead of transferring as token
    if (mint.toBase58() === WSOL_MINT) {
      console.log('Unwrapping wSOL to native SOL...');
      
      // Closing wSOL account automatically unwraps to native SOL
      // Send the unwrapped SOL directly to destination
      tx.add(
        createCloseAccountInstruction(
          pubkey,           // wSOL token account to close
          destination,      // Send unwrapped SOL here
          disposable.publicKey  // Authority
        )
      );
      
      // Track that we're sending SOL via unwrap
      console.log('wSOL will be unwrapped to', info.tokenAmount.uiAmount, 'native SOL');
      continue;
    }

    // For other tokens, transfer normally
    const destAta = await getAssociatedTokenAddress(mint, destination);

    const destAtaInfo = await conn.getAccountInfo(destAta);
    if (!destAtaInfo) {
      // Fee payer creates the ATA
      tx.add(
        createAssociatedTokenAccountInstruction(
          feePayer?.publicKey || disposable.publicKey,
          destAta,
          destination,
          mint
        )
      );
    }

    tx.add(
      createTransferCheckedInstruction(
        pubkey,
        mint,
        destAta,
        disposable.publicKey,
        amount,
        decimals
      )
    );

    // Close account and send rent to fee payer (as refund) or disposable
    tx.add(
      createCloseAccountInstruction(
        pubkey,
        feePayer?.publicKey || disposable.publicKey,
        disposable.publicKey
      )
    );
  }

  // Check if there's anything to claim
  const hasTokens = tx.instructions.length > 0;
  
  if (!hasTokens && solBalance === 0) {
    throw new Error('Nothing to claim - no SOL or tokens found');
  }

  // Determine fee payer
  const feePayerPubkey = feePayer?.publicKey || disposable.publicKey;
  
  // If no external fee payer and no SOL, we can't proceed
  if (!feePayer && solBalance === 0 && hasTokens) {
    throw new Error('No SOL for fees. Connect your destination wallet to pay fees.');
  }

  const { blockhash } = await conn.getLatestBlockhash();
  tx.feePayer = feePayerPubkey;
  tx.recentBlockhash = blockhash;

  // Add SOL transfer if there's any balance
  if (solBalance > 0) {
    // If fee payer is external, transfer all SOL
    // If fee payer is disposable, leave enough for fees
    const feeAmount = feePayer ? 0 : 5000;
    const transferAmount = solBalance - feeAmount;
    
    console.log('SOL to transfer:', transferAmount / LAMPORTS_PER_SOL);
    
    if (transferAmount > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: disposable.publicKey,
          toPubkey: destination,
          lamports: transferAmount,
        })
      );
    }
  }

  if (tx.instructions.length === 0) {
    throw new Error('Nothing to claim');
  }

  // Re-fetch blockhash right before signing
  const fresh = await conn.getLatestBlockhash();
  tx.recentBlockhash = fresh.blockhash;

  // Sign with disposable key (for token transfers)
  tx.partialSign(disposable);

  // If external fee payer, have them sign too
  if (feePayer) {
    console.log('Requesting fee payer signature...');
    const signedTx = await feePayer.signTransaction(tx);
    // Use the fully signed transaction
    Object.assign(tx, signedTx);
  }

  console.log('Sending transaction with', tx.instructions.length, 'instructions');

  // Use skipPreflight to avoid simulation issues
  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
    preflightCommitment: 'confirmed',
  });

  console.log('Transaction sent:', sig);

  await conn.confirmTransaction({
    signature: sig,
    blockhash: fresh.blockhash,
    lastValidBlockHeight: fresh.lastValidBlockHeight,
  });

  return sig;
}

export async function claimSplit(
  disposable: Keypair,
  destinations: SplitDestination[],
  options?: ClaimOptions
): Promise<string> {
  // Validate destinations
  if (destinations.length === 0) {
    throw new Error('At least one destination required');
  }
  
  if (destinations.length > 10) {
    throw new Error('Maximum 10 destinations supported');
  }
  
  const totalPercent = destinations.reduce((sum, d) => sum + d.percentage, 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error('Percentages must sum to 100%');
  }

  const conn = getConnection();
  const feePayer = options?.feePayer;
  
  console.log('Split claim from:', disposable.publicKey.toBase58());
  console.log('Destinations:', destinations.map(d => ({
    address: d.address.toBase58(),
    percentage: d.percentage
  })));
  console.log('Network:', useMainnet ? 'MAINNET' : 'DEVNET');
  
  const tx = new Transaction();

  // Get SOL balance
  const solBalance = await conn.getBalance(disposable.publicKey);
  console.log('SOL balance:', solBalance / LAMPORTS_PER_SOL);

  // Get all token accounts
  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(
    disposable.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  console.log('Token accounts found:', tokenAccounts.value.length);

  const WSOL_MINT = 'So11111111111111111111111111111111111111112';
  
  // Track wSOL that will be unwrapped to native SOL
  let wsolAmount = 0n;
  let wsolTokenAccount: PublicKey | null = null;
  
  // Process token accounts
  for (const { account, pubkey } of tokenAccounts.value) {
    const info = account.data.parsed.info;
    const mint = new PublicKey(info.mint);
    const amount = BigInt(info.tokenAmount.amount);
    const decimals = info.tokenAmount.decimals;

    if (amount === 0n) continue;

    // Handle wSOL specially - unwrap first, then split native SOL
    if (mint.toBase58() === WSOL_MINT) {
      wsolAmount = amount;
      wsolTokenAccount = pubkey;
      console.log('wSOL found:', info.tokenAmount.uiAmount, 'will be unwrapped and split');
      continue;
    }

    // For other tokens, split across destinations
    console.log('Splitting token:', mint.toBase58(), 'Amount:', info.tokenAmount.uiAmount);
    
    let remainingAmount = amount;
    
    for (let i = 0; i < destinations.length; i++) {
      const dest = destinations[i];
      const isLast = i === destinations.length - 1;
      
      // Calculate amount for this destination
      const destAmount = isLast 
        ? remainingAmount  // Last destination gets remainder to avoid rounding issues
        : BigInt(Math.floor(Number(amount) * dest.percentage / 100));
      
      if (destAmount === 0n) continue;
      remainingAmount -= destAmount;
      
      const destAta = await getAssociatedTokenAddress(mint, dest.address);
      const destAtaInfo = await conn.getAccountInfo(destAta);
      
      if (!destAtaInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            feePayer?.publicKey || disposable.publicKey,
            destAta,
            dest.address,
            mint
          )
        );
      }

      tx.add(
        createTransferCheckedInstruction(
          pubkey,
          mint,
          destAta,
          disposable.publicKey,
          destAmount,
          decimals
        )
      );
    }

    // Close token account, send rent to fee payer or disposable
    tx.add(
      createCloseAccountInstruction(
        pubkey,
        feePayer?.publicKey || disposable.publicKey,
        disposable.publicKey
      )
    );
  }

  // If we have wSOL, close it first to unwrap to native SOL
  // The unwrapped SOL goes to disposable, then we split it with the other SOL
  if (wsolTokenAccount && wsolAmount > 0n) {
    tx.add(
      createCloseAccountInstruction(
        wsolTokenAccount,
        disposable.publicKey,  // Unwrap to disposable first
        disposable.publicKey
      )
    );
  }

  // Calculate total SOL to split (existing balance + unwrapped wSOL)
  const totalSolLamports = solBalance + Number(wsolAmount);
  
  if (totalSolLamports > 0) {
    // Reserve for fees if disposable is paying
    const feeReserve = feePayer ? 0 : 5000;
    const distributableSol = totalSolLamports - feeReserve;
    
    if (distributableSol > 0) {
      let remainingSol = distributableSol;
      
      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        const isLast = i === destinations.length - 1;
        
        const destAmount = isLast
          ? remainingSol
          : Math.floor(distributableSol * dest.percentage / 100);
        
        if (destAmount > 0) {
          remainingSol -= destAmount;
          
          tx.add(
            SystemProgram.transfer({
              fromPubkey: disposable.publicKey,
              toPubkey: dest.address,
              lamports: destAmount,
            })
          );
          
          console.log(`SOL to ${dest.address.toBase58().slice(0,8)}...: ${destAmount / LAMPORTS_PER_SOL}`);
        }
      }
    }
  }

  if (tx.instructions.length === 0) {
    throw new Error('Nothing to claim');
  }

  // Set fee payer and recent blockhash
  const feePayerPubkey = feePayer?.publicKey || disposable.publicKey;
  
  if (!feePayer && solBalance === 0 && wsolAmount === 0n) {
    throw new Error('No SOL for fees. Connect your wallet to pay fees.');
  }

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.feePayer = feePayerPubkey;
  tx.recentBlockhash = blockhash;

  // Sign with disposable key
  tx.partialSign(disposable);

  // If external fee payer, have them sign
  if (feePayer) {
    console.log('Requesting fee payer signature...');
    const signedTx = await feePayer.signTransaction(tx);
    Object.assign(tx, signedTx);
  }

  console.log('Sending split transaction with', tx.instructions.length, 'instructions');

  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
    preflightCommitment: 'confirmed',
  });

  console.log('Transaction sent:', sig);

  await conn.confirmTransaction({
    signature: sig,
    blockhash,
    lastValidBlockHeight,
  });

  return sig;
}

export async function pollForFunds(
  address: PublicKey,
  onUpdate: (balances: Balances) => void,
  intervalMs = 5000
): Promise<() => void> {
  let running = true;

  const poll = async () => {
    while (running) {
      try {
        const balances = await getBalances(address);
        onUpdate(balances);
      } catch (e) {
        console.error('Poll error:', e);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  };

  poll();

  return () => {
    running = false;
  };
}

