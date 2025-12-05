# How It Works

Pridge achieves privacy through a simple but effective mechanism: **disposable intermediate addresses**.

## The Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         STEP 1: GENERATE                     │
│  Browser generates fresh Solana keypair                      │
│  Private key stored only in memory                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         STEP 2: BRIDGE                       │
│  Connect MetaMask → Select chain → Enter amount              │
│  deBridge transfers assets to disposable address             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         STEP 3: SAVE LINK                    │
│  Claim URL contains private key in fragment                  │
│  Example: pridge.io/#<base58_encoded_private_key>           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         STEP 4: CLAIM                        │
│  Open claim link → Enter destination → Claim                 │
│  Funds transfer to any Solana wallet                         │
└─────────────────────────────────────────────────────────────┘
```

## Why URL Fragments?

The private key is stored in the **URL fragment** (the part after `#`):

```
https://pridge.io/#3bkJCGFKYvkogDh3fjv8VLsCVmFn9tt...
                   ↑
                   Fragment (never sent to server)
```

Per HTTP specification, URL fragments are **never transmitted** to servers. They exist only in your browser.

## The Privacy Guarantee

On-chain, the only visible transactions are:

1. **Source → Disposable**: Your EVM wallet sends to a random Solana address
2. **Disposable → Destination**: The disposable address sends to your final wallet

There is no transaction linking these two. The disposable address is:

- Generated randomly
- Used once
- Discarded after claiming

## Technical Components

### Keypair Generation

```typescript
// Uses Solana's Keypair.generate() with browser's crypto.getRandomValues()
const disposable = Keypair.generate();
```

### Claim Link Encoding

```typescript
// Private key encoded as base58
const fragment = bs58.encode(keypair.secretKey);
const claimUrl = `${origin}/#${fragment}`;
```

### Asset Transfer

On claim, Pridge:

1. Checks for SPL tokens (including wSOL)
2. Automatically unwraps wSOL to native SOL
3. Transfers all assets to the destination
4. Closes token accounts (recovers rent)

## What deBridge Sees

deBridge processes the cross-chain transfer but only knows:

- Source: Your EVM wallet address
- Destination: The disposable Solana address

They never see your final destination wallet.

