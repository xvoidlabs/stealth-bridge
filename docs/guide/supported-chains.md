# Supported Chains

Pridge supports bridging from multiple EVM chains to Solana.

## Source Chains

| Chain | Chain ID | Native Token | Status |
|-------|----------|--------------|--------|
| Ethereum | 1 | ETH | Live |
| BNB Chain | 56 | BNB | Live |
| Polygon | 137 | MATIC | Live |
| Arbitrum | 42161 | ETH | Live |
| Base | 8453 | ETH | Live |
| Optimism | 10 | ETH | Live |
| Avalanche | 43114 | AVAX | Live |

## Destination Chain

| Chain | Status |
|-------|--------|
| Solana | Live (always) |

## Supported Assets

Currently, Pridge supports bridging **native tokens only**:

- ETH (from Ethereum, Arbitrum, Base, Optimism)
- BNB (from BNB Chain)
- MATIC (from Polygon)
- AVAX (from Avalanche)

All bridged assets arrive as **wSOL** (Wrapped SOL) on Solana, which is automatically **unwrapped to native SOL** when claimed.

## Coming Soon

- USDC bridging
- USDT bridging
- Other major tokens

## Bridge Provider

Pridge uses [deBridge DLN](https://debridge.finance) for cross-chain messaging:

- Battle-tested infrastructure
- Fast settlement (1-5 minutes)
- Competitive fees
- No slippage on native tokens

## Gas Fees

You'll need gas on the source chain:

| Chain | Typical Gas |
|-------|-------------|
| Ethereum | ~$5-20 |
| Arbitrum | ~$0.10-0.50 |
| Base | ~$0.05-0.20 |
| Optimism | ~$0.10-0.50 |
| Polygon | ~$0.01-0.05 |
| BSC | ~$0.10-0.30 |
| Avalanche | ~$0.10-0.50 |

Plus deBridge protocol fees (shown in quote).

