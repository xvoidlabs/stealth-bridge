---
layout: home

hero:
  name: Pridge
  text: Privacy-First Bridge
  tagline: Private multichain-to-Solana transfers. No tracking. No servers. No compromises.
  image:
    src: /logo.svg
    alt: Pridge
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/xvoidlabs/stealth-bridge

features:
  - icon: 🔒
    title: True Privacy
    details: Source and destination wallets are never linked on-chain. Break the trail completely.
  - icon: 🌐
    title: Multi-Chain
    details: Bridge from Ethereum, Arbitrum, Base, BSC, Polygon, Optimism, and Avalanche to Solana.
  - icon: 💻
    title: 100% Client-Side
    details: No backend, no servers, no data collection. Everything runs in your browser.
  - icon: ⚡
    title: Auto Unwrap
    details: Bridged wSOL automatically converts to native SOL when you claim. No extra steps.
  - icon: 🔗
    title: One-Time Links
    details: Claim links contain the private key in the URL fragment. Never transmitted to any server.
  - icon: 💰
    title: Fee Sponsoring
    details: Destination wallet can pay claim fees. No need to fund the disposable address.
---

## How It Works

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  EVM Wallet │───▶│  Disposable │───▶│ Destination │
│  (Source)   │    │   Address   │    │   Wallet    │
└─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │
      │    deBridge       │   Claim Link     │
      │    Protocol       │   (one-time)     │
      └───────────────────┴──────────────────┘
              NO ON-CHAIN LINK
```

The source wallet and final destination are **never connected** on-chain.

