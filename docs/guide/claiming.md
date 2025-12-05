# Claiming Funds

This guide explains how to claim bridged funds to your destination wallet.

## Using the Claim Link

The claim link contains everything needed to access the funds:

```
https://pridge.io/#4tzikrqxRZQAqKTnhpA86HAgHBjp...
                   └─────────────────────────────┘
                           Private Key
```

Simply open the link in any browser.

## Claim Process

### 1. Open Claim Link

Navigate to your claim link. The page will:
- Decode the private key from the URL
- Load balances from the disposable address
- Display available funds

### 2. Enter Destination

Type or paste your destination Solana wallet address.

::: tip Privacy
For maximum privacy, use a wallet that has no connection to your source EVM wallet.
:::

### 3. Connect Phantom (If Needed)

If the disposable address has tokens but no SOL for fees:

1. Click **"Connect Phantom (Pay Fees)"**
2. Approve connection
3. Your Phantom wallet will pay the ~0.00025 SOL fee

### 4. Click Claim

Click **"Claim All"** to:
- Transfer all tokens to destination
- Unwrap wSOL to native SOL
- Close token accounts (recover rent)

### 5. Confirm

If using Phantom for fees, you'll see a signature request. Approve it.

## What Gets Claimed

The claim transaction handles:

| Asset | Action |
|-------|--------|
| wSOL (Wrapped SOL) | Unwrap to native SOL, send to destination |
| Other SPL Tokens | Transfer to destination's token account |
| Native SOL | Transfer to destination |
| Token Account Rent | Recovered and included in transfer |

## Fee Sponsoring

When the disposable has no SOL:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Disposable │────▶│ Transaction │────▶│ Destination │
│  (tokens)   │     │             │     │  (receives) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                   ┌──────▼──────┐
                   │   Phantom   │
                   │  (pays fee) │
                   └─────────────┘
```

Your Phantom wallet:
- Signs as fee payer
- Pays ~0.00025 SOL
- Receives rent refunds from closed accounts

## After Claiming

Once claimed:
- Disposable address is empty
- Claim link is "used" (no more funds)
- Destination has your assets

::: warning One-Time
Each claim link works only once. After claiming, the funds are gone from the disposable address.
:::

## Manual Recovery

If the website is unavailable, you can still access funds:

```javascript
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Extract from claim link
const fragment = 'your_claim_fragment_here';
const secretKey = bs58.decode(fragment);
const keypair = Keypair.fromSecretKey(secretKey);

// Export for wallet import
console.log('Private key:', bs58.encode(keypair.secretKey));
```

Import this into Phantom or any Solana wallet to access the funds directly.

