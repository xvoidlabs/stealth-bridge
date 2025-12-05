# Stealth Bridge

A privacy-preserving multichain-to-Solana bridge. 100% client-side PWA with no backend, no servers, no tracking.

## Overview

Stealth Bridge enables private cross-chain transfers to Solana by breaking the on-chain link between source and destination wallets. Users bridge assets through a disposable intermediate address, then claim to any wallet using a one-time link.

### How It Works

1. **Generate** - Create a disposable Solana keypair in the browser
2. **Bridge** - Transfer assets from any EVM chain to the disposable address
3. **Share** - Get a claim link containing the private key (URL fragment only, never transmitted)
4. **Claim** - Anyone with the link can claim funds to any Solana wallet

The source wallet and final destination wallet are never linked on-chain.

## Supported Chains

| Source Chain | Chain ID | Status |
|--------------|----------|--------|
| Ethereum     | 1        | Live   |
| BNB Chain    | 56       | Live   |
| Polygon      | 137      | Live   |
| Arbitrum     | 42161    | Live   |
| Base         | 8453     | Live   |
| Optimism     | 10       | Live   |
| Avalanche    | 43114    | Live   |

Destination: **Solana** (always)

## Features

- **Client-Side Only** - No backend, no servers, no data collection
- **Privacy First** - Source and destination wallets never linked on-chain
- **Auto Unwrap** - Bridged wSOL automatically converts to native SOL on claim
- **Fee Sponsoring** - Destination wallet can pay claim fees (no need to fund disposable)
- **Multi-Chain** - Bridge from any major EVM chain
- **Real-Time Detection** - Automatic balance polling when funds arrive

## Tech Stack

- TypeScript / Vite
- Solana Web3.js / SPL Token
- Ethers.js v6
- deBridge DLN API (cross-chain messaging)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/xvoidlabs/stealth-bridge.git
cd stealth-bridge

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your RPC endpoints

# Start development server
npm run dev
```

### Build

```bash
npm run build
```

Output in `dist/` - deployable as static files to any hosting (Vercel, IPFS, etc.)

## Configuration

Create a `.env` file:

```env
VITE_HELIUS_API_KEY=your_helius_api_key
VITE_SOLANA_RPC=https://api.mainnet-beta.solana.com
```

## Architecture

```
src/
├── main.ts          # Application entry, routing, UI rendering
├── keypair.ts       # Disposable keypair generation and encoding
├── claim.ts         # Solana balance fetching, claim transactions
├── debridge.ts      # deBridge API integration
├── evm-wallet.ts    # MetaMask connection and EVM transactions
├── solana-wallet.ts # Phantom wallet integration for fee sponsoring
└── ui.ts            # DOM utilities and toast notifications
```

## Security Considerations

- Private keys exist only in browser memory and URL fragments
- URL fragments are never sent to servers (per HTTP spec)
- No analytics, no tracking, no external requests except RPCs and bridge API
- Claim links should be treated as bearer tokens - anyone with the link can claim

## Disclaimer

This software is provided as-is for educational and experimental purposes. Users are responsible for:

- Securing their claim links
- Understanding cross-chain bridge risks
- Complying with applicable regulations

Not audited. Use at your own risk.

## License

MIT

## Links

- [deBridge Documentation](https://docs.debridge.finance/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

