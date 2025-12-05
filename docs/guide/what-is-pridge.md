# What is Pridge?

Pridge is a **privacy-preserving cross-chain bridge** that enables private transfers from EVM chains to Solana.

## The Problem

Traditional bridges create a direct on-chain link between your source wallet and destination wallet. Anyone can trace:

- Where your funds came from
- Where they went
- Your complete transaction history

This compromises financial privacy and can expose your holdings.

## The Solution

Pridge breaks this link by using a **disposable intermediate address**:

1. Generate a fresh Solana keypair in your browser
2. Bridge assets from any EVM chain to this disposable address
3. Get a one-time claim link (private key in URL fragment)
4. Claim to any wallet - no connection to your source

## Key Properties

### Privacy

The source wallet (EVM) and destination wallet (Solana) are **never linked on-chain**. The disposable address acts as a privacy buffer.

### Client-Side Only

Pridge runs entirely in your browser:

- No backend servers
- No databases
- No tracking or analytics
- No accounts to create

### Non-Custodial

You control your keys at every step:

- Disposable keypairs are generated locally
- Private keys exist only in browser memory
- Claim links give full control to the holder

### Trustless

Pridge uses battle-tested infrastructure:

- deBridge DLN for cross-chain messaging
- Solana Web3.js for on-chain operations
- No custom smart contracts to trust

## Who Is It For?

- Users who value financial privacy
- Anyone moving assets to Solana privately
- Developers studying privacy-preserving systems
- Projects needing private treasury operations

