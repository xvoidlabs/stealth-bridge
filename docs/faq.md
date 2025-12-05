# FAQ

Frequently asked questions about Pridge.

## General

### What is Pridge?

Pridge is a privacy-preserving bridge for transferring assets from EVM chains (Ethereum, Arbitrum, Base, etc.) to Solana without linking your source and destination wallets on-chain.

### Why "Pridge"?

**P**rivacy + B**ridge** = **Pridge**

### Is Pridge free?

Pridge itself charges no fees. You pay:
- Gas on the source chain
- deBridge protocol fees (shown in quote)
- Solana transaction fees (~0.00025 SOL)

### Is Pridge open source?

Yes, fully MIT licensed: [GitHub](https://github.com/xvoidlabs/stealth-bridge)

---

## Privacy

### How does Pridge protect my privacy?

By using a disposable intermediate address. Your source wallet sends to a random address, then that address sends to your destination. There's no on-chain transaction connecting the two.

### Can anyone trace my transfer?

On-chain, observers can see:
- Your source wallet → disposable address
- Disposable address → destination wallet

But they cannot prove these are related without the claim link.

### Is the claim link secure?

The private key is in the URL fragment (`#`), which is never sent to servers per HTTP spec. However, anyone with the full URL can claim the funds.

### What if I lose my claim link?

Your funds are lost. There is no recovery mechanism. Always save the link before bridging.

---

## Technical

### Which wallets are supported?

**Source (EVM):**
- MetaMask
- Any WalletConnect-compatible wallet

**Destination (Solana):**
- Any Solana address
- Phantom (for fee sponsoring)

### Why do I receive wSOL instead of SOL?

Cross-chain bridges send wrapped tokens. Pridge automatically unwraps wSOL to native SOL when you claim.

### Why does claiming need fees?

Solana transactions require a small fee (~0.00025 SOL). If the disposable address has no SOL, you can connect Phantom to pay the fee.

### How long do transfers take?

Typically 1-5 minutes. The bridge needs to confirm on the source chain and process the cross-chain message.

---

## Troubleshooting

### "No funds found" when claiming

1. Check you're on the correct network (mainnet vs devnet)
2. Wait a few minutes - bridge transfers aren't instant
3. Verify the address on [Solscan](https://solscan.io)

### MetaMask shows an error

1. Make sure you're on the correct network
2. Check you have enough gas
3. Try refreshing and reconnecting

### Transaction stuck

Cross-chain transactions occasionally take longer. Check deBridge status:
- [deBridge Explorer](https://app.debridge.finance/orders)

### Claim link doesn't work

1. Make sure you copied the full URL including the `#` fragment
2. The fragment should be a long base58 string
3. Try opening in incognito mode

---

## Safety

### Is Pridge audited?

Not yet. Use at your own risk and test with small amounts first.

### Can Pridge steal my funds?

No. Pridge never has access to your private keys. Everything runs in your browser.

### What if Pridge website goes down?

The claim link contains the full private key. You can always import it into any Solana wallet to access your funds.

```javascript
// Extract keypair from claim link
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const fragment = 'your_claim_link_fragment';
const keypair = Keypair.fromSecretKey(bs58.decode(fragment));
// Import keypair.secretKey into Phantom/Solflare
```

