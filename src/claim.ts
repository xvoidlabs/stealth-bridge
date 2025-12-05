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
const HELIUS_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';

const MAINNET_RPCS = HELIUS_KEY 
  ? [`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, 'https://api.mainnet-beta.solana.com']
  : ['https://api.mainnet-beta.solana.com'];

const DEVNET_RPCS = HELIUS_KEY
  ? [`https://devnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, 'https://api.devnet.solana.com']
  : ['https://api.devnet.solana.com'];

let useMainnet = !window.location.search.includes('devnet'); // Add ?devnet to URL for testing
let rpcIndex = 0;

function getConnection(): Connection {
  const rpcs = useMainnet ? MAINNET_RPCS : DEVNET_RPCS;
  return new Connection(rpcs[rpcIndex % rpcs.length], 'confirmed');
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
  const conn = getConnection();
  
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
}

export interface ClaimOptions {
  feePayer?: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  };
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

