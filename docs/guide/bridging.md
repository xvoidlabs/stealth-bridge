# Bridging Assets

This guide covers bridging assets from EVM chains to your disposable Solana address.

## Prerequisites

- MetaMask installed
- Assets on a supported chain
- Gas for the transaction

## Connect Your Wallet

1. Click **"Connect MetaMask"**
2. Approve the connection request
3. Your address and chain will be displayed

## Select Source Chain

Use the dropdown to select your source chain:

- Ethereum
- Arbitrum
- Base
- BNB Chain
- Polygon
- Optimism
- Avalanche

If you're on a different chain, MetaMask will prompt you to switch.

## Enter Amount

Type the amount you want to bridge. This is in the native token of the source chain (ETH, BNB, MATIC, etc.).

::: tip Start Small
For your first bridge, start with a small amount to test the flow.
:::

## Get Quote

Click **"Get Quote"** to see:

- **Receive Amount**: How much SOL you'll get
- **Protocol Fee**: deBridge fees

The quote accounts for:
- Bridge fees
- Price conversion
- Operating expenses

## Execute Bridge

1. Review the quote
2. Click **"Bridge Now"**
3. MetaMask popup appears
4. Review transaction details
5. Click **Confirm**

## Transaction Processing

After confirming:

1. Transaction submits to source chain
2. Wait for source chain confirmation
3. deBridge processes cross-chain message
4. Funds arrive on Solana

This typically takes **1-5 minutes**.

## Monitoring

### On-Page Status

The page shows real-time status:
- "Waiting for funds..."
- "Funds received!"

### External Tracking

You can also check:
- Source chain explorer (Etherscan, Arbiscan, etc.)
- [deBridge Explorer](https://app.debridge.finance/orders)
- [Solscan](https://solscan.io) (destination address)

## What You Receive

Bridged assets arrive as **Wrapped SOL (wSOL)** on Solana. This is automatically converted to native SOL when you claim.

## Troubleshooting

### Transaction Fails

- Check gas balance
- Try increasing gas limit
- Ensure sufficient funds for amount + fees

### Funds Not Arriving

- Wait 5-10 minutes
- Check deBridge order status
- Verify correct destination address

### Wrong Chain

- Use MetaMask network switcher
- Or click a chain button to auto-switch

