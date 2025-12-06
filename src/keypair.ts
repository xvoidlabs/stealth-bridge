import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export interface ClaimData {
  keypair: Keypair;
  expiresAt: number | null; // Unix timestamp in seconds, null = never expires
}

export function generate(): Keypair {
  return Keypair.generate();
}

export function toClaimFragment(kp: Keypair, expiresAt?: number | null): string {
  const keyPart = bs58.encode(kp.secretKey);
  if (expiresAt) {
    return `${keyPart}_${expiresAt}`;
  }
  return keyPart;
}

export function fromClaimFragment(fragment: string): ClaimData | null {
  try {
    // Check if fragment has expiration suffix
    const parts = fragment.split('_');
    const keyPart = parts[0];
    const expiresAt = parts[1] ? parseInt(parts[1], 10) : null;

    const decoded = bs58.decode(keyPart);
    if (decoded.length !== 64) return null;

    return {
      keypair: Keypair.fromSecretKey(decoded),
      expiresAt: expiresAt && !isNaN(expiresAt) ? expiresAt : null,
    };
  } catch {
    return null;
  }
}

export function isExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return false;
  return Date.now() / 1000 > expiresAt;
}

export function getTimeRemaining(expiresAt: number | null): { expired: boolean; text: string } {
  if (!expiresAt) {
    return { expired: false, text: 'Never expires' };
  }

  const now = Date.now() / 1000;
  const remaining = expiresAt - now;

  if (remaining <= 0) {
    return { expired: true, text: 'Expired' };
  }

  // Format remaining time
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = Math.floor(remaining % 60);

  if (days > 0) {
    return { expired: false, text: `${days}d ${hours}h remaining` };
  } else if (hours > 0) {
    return { expired: false, text: `${hours}h ${minutes}m remaining` };
  } else if (minutes > 0) {
    return { expired: false, text: `${minutes}m ${seconds}s remaining` };
  } else {
    return { expired: false, text: `${seconds}s remaining` };
  }
}

export function getClaimUrl(kp: Keypair, expiresAt?: number | null): string {
  return `${window.location.origin}${window.location.pathname}#${toClaimFragment(kp, expiresAt)}`;
}

export function getAddressShort(kp: Keypair): string {
  const addr = kp.publicKey.toBase58();
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

