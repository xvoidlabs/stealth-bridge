import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export function generate(): Keypair {
  return Keypair.generate();
}

export function toClaimFragment(kp: Keypair): string {
  return bs58.encode(kp.secretKey);
}

export function fromClaimFragment(fragment: string): Keypair | null {
  try {
    const decoded = bs58.decode(fragment);
    if (decoded.length !== 64) return null;
    return Keypair.fromSecretKey(decoded);
  } catch {
    return null;
  }
}

export function getClaimUrl(kp: Keypair): string {
  return `${window.location.origin}${window.location.pathname}#${toClaimFragment(kp)}`;
}

export function getAddressShort(kp: Keypair): string {
  const addr = kp.publicKey.toBase58();
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

