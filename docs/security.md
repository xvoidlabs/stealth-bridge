# Security

Pridge is designed with security and privacy as core principles. This page explains our security model.

## Threat Model

### What Pridge Protects Against

| Threat | Protection |
|--------|------------|
| On-chain tracking | Disposable addresses break the link |
| Server data collection | No backend, everything client-side |
| URL snooping | Private keys in URL fragments (never transmitted) |
| Key theft in transit | Keys never leave your browser |

### What Pridge Does NOT Protect Against

| Threat | Why |
|--------|-----|
| Compromised browser | Malware can read browser memory |
| Shared claim links | Anyone with the link can claim |
| Network analysis | Bridge transactions are still visible |
| Compromised RPC | Malicious RPC could potentially manipulate data |

## Security Architecture

### Client-Side Only

```
┌─────────────────────────────────────────────┐
│              YOUR BROWSER                    │
│  ┌─────────────────────────────────────┐    │
│  │  Keypair Generation                  │    │
│  │  Transaction Signing                 │    │
│  │  Claim Link Encoding                 │    │
│  └─────────────────────────────────────┘    │
│                    │                         │
│                    │ Read-only API calls     │
│                    ▼                         │
└─────────────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
  [Solana RPC]  [deBridge API]  [EVM RPC]
```

No backend server ever sees your private keys.

### URL Fragment Privacy

The claim link structure:

```
https://pridge.io/#3bkJCGFKYvkogDh3fjv8...
                   ↑
                   This is NEVER sent to servers
```

Per [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986#section-3.5), URL fragments are processed client-side only.

### Keypair Generation

```typescript
// Cryptographically secure random generation
import { Keypair } from '@solana/web3.js';
const disposable = Keypair.generate();
// Uses crypto.getRandomValues() under the hood
```

## Best Practices

### Do

- Save claim links securely (password manager, encrypted storage)
- Test with small amounts first
- Verify you're on the correct domain (pridge.io)
- Use a fresh browser session for sensitive operations
- Clear browser data after claiming

### Don't

- Share claim links on public channels
- Reuse disposable addresses
- Claim to wallets already linked to your identity
- Use on untrusted devices or networks
- Screenshot claim links (they may sync to cloud)

## Audits

::: warning
Pridge has not been formally audited. Use at your own risk.
:::

The codebase is open source for community review:
- [GitHub Repository](https://github.com/xvoidlabs/stealth-bridge)

## Responsible Disclosure

Found a vulnerability? Please report privately:

1. **Do not** open a public GitHub issue
2. Contact us via [Twitter DM](https://x.com/pridgeio)
3. Allow reasonable time for fixes before disclosure

## Dependencies

Pridge relies on:

| Dependency | Purpose | Trust Level |
|------------|---------|-------------|
| Solana Web3.js | Keypair, transactions | High (official SDK) |
| deBridge API | Cross-chain messaging | Medium (external service) |
| Ethers.js | EVM interactions | High (industry standard) |
| Helius RPC | Solana RPC | Medium (external service) |

## Open Source

All code is MIT licensed and available for inspection:

```bash
git clone https://github.com/xvoidlabs/stealth-bridge
```

We encourage security researchers to review and report findings.

