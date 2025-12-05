# Architecture

Technical overview of Pridge's architecture.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     PRIDGE APP                           │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │ Keypair │  │ Bridge  │  │  Claim  │  │   UI    │    │    │
│  │  │ Module  │  │ Module  │  │ Module  │  │ Module  │    │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │    │
│  │       │            │            │            │          │    │
│  │       └────────────┴────────────┴────────────┘          │    │
│  │                          │                               │    │
│  └──────────────────────────┼───────────────────────────────┘    │
│                             │                                    │
│  ┌──────────────────────────┼───────────────────────────────┐    │
│  │                    WALLET ADAPTERS                        │    │
│  │  ┌─────────────┐                    ┌─────────────┐      │    │
│  │  │  MetaMask   │                    │   Phantom   │      │    │
│  │  │  (EVM)      │                    │  (Solana)   │      │    │
│  │  └──────┬──────┘                    └──────┬──────┘      │    │
│  └─────────┼───────────────────────────────────┼────────────┘    │
└────────────┼───────────────────────────────────┼─────────────────┘
             │                                   │
             ▼                                   ▼
    ┌────────────────┐                 ┌────────────────┐
    │   EVM RPCs     │                 │  Solana RPCs   │
    │  (Public)      │                 │  (Helius)      │
    └────────────────┘                 └────────────────┘
             │
             ▼
    ┌────────────────┐
    │  deBridge API  │
    │  (Cross-chain) │
    └────────────────┘
```

## Module Breakdown

### keypair.ts

Handles disposable Solana keypair operations.

```typescript
// Key functions
generate(): Keypair           // Create new keypair
toClaimFragment(kp): string   // Encode to URL fragment
fromClaimFragment(str): Keypair // Decode from fragment
getClaimUrl(kp): string       // Full claim URL
```

### debridge.ts

Integrates with deBridge DLN API for cross-chain messaging.

```typescript
// Key functions
getQuote(params): Promise<Quote>      // Get bridge quote
createTransaction(params): Promise<Tx> // Create bridge tx
executeBridge(wallet, tx): Promise<hash> // Execute via MetaMask
```

### claim.ts

Manages Solana balance checking and claim transactions.

```typescript
// Key functions
getBalances(address): Promise<Balances>  // Fetch SOL + tokens
claimAll(disposable, destination, opts): Promise<sig> // Claim everything
pollForFunds(address, callback, interval) // Real-time polling
```

### evm-wallet.ts

MetaMask integration for EVM chains.

```typescript
// Key functions
connectWallet(): Promise<EVMWallet>
switchChain(chainId): Promise<void>
getBalance(address): Promise<string>
```

### solana-wallet.ts

Phantom integration for fee sponsoring.

```typescript
// Key functions
connectWallet(): Promise<SolanaWallet>
getCurrentWallet(): SolanaWallet | null
disconnectWallet(): void
```

## Data Flow

### Bridge Flow

```
1. User creates deposit
   └─▶ Keypair.generate() → Disposable address

2. User bridges assets
   └─▶ MetaMask signs → deBridge API → Cross-chain tx

3. Assets arrive on Solana
   └─▶ wSOL deposited to disposable address

4. User claims
   └─▶ Phantom signs (fee) → Solana tx → Destination
```

### Claim Link Encoding

```
Private Key (Uint8Array[64])
     │
     ▼
bs58.encode()
     │
     ▼
URL Fragment (#...)
     │
     ▼
Full URL: https://pridge.io/#<encoded>
```

## External Dependencies

### deBridge DLN

- Quote endpoint: `GET /v1.0/dln/order/quote`
- Create tx endpoint: `GET /v1.0/dln/order/create-tx`
- Settlement: Handled by deBridge solvers

### Solana RPCs

Primary: Helius (with API key)
Fallback: Public RPC

### EVM RPCs

Public RPCs for each supported chain (Llamanodes, etc.)

## Security Boundaries

```
┌─────────────────────────────────────┐
│         TRUSTED ZONE                │
│  (Your browser, your control)       │
│  - Keypair generation               │
│  - Transaction signing              │
│  - Claim link storage               │
└─────────────────────────────────────┘
                 │
                 │ Read-only data
                 ▼
┌─────────────────────────────────────┐
│       SEMI-TRUSTED ZONE             │
│  (External services, verify data)   │
│  - RPC responses                    │
│  - deBridge quotes                  │
└─────────────────────────────────────┘
```

## State Management

Simple in-memory state object:

```typescript
interface AppState {
  mode: 'home' | 'deposit' | 'claim';
  disposable: Keypair | null;
  balances: Balances | null;
  evmConnected: boolean;
  solWalletConnected: boolean;
  selectedChain: number;
  quote: DeBridgeQuote | null;
}
```

No persistence. State exists only during session.

