# Creating a Deposit

This guide explains how to create a new private deposit session.

## What Happens

When you click "Create Private Deposit":

1. A new Solana keypair is generated in your browser
2. The public key becomes the disposable address
3. The private key is encoded into the claim link
4. Nothing is sent to any server

## Step by Step

### 1. Visit Pridge

Go to [pridge.io](https://pridge.io)

### 2. Click Create

Click the **"Create Private Deposit"** button.

### 3. Save the Claim Link

::: danger CRITICAL
Copy and save the claim link **before** bridging any funds. This is your only way to access the deposited assets.
:::

The claim link looks like:
```
https://pridge.io/#4tzikrqxRZQAqKTnhpA86HAgHBjp...
```

### 4. Secure Storage

Store the claim link safely:

| Method | Security | Convenience |
|--------|----------|-------------|
| Password Manager | High | High |
| Encrypted Note | High | Medium |
| Paper Backup | Medium | Low |
| Plain Text File | Low | High |

## The Disposable Address

The generated address is shown in the UI:

```
Destination: 7aXV6Ga...edRRg
```

This is where bridged funds will arrive. It's a standard Solana address.

## Important Notes

### One-Time Use

Each disposable address should only be used once. Creating a new deposit generates a new address.

### No Recovery

If you lose the claim link, your funds are **permanently lost**. There is no recovery mechanism, no support team, no backdoor.

### Browser Session

The keypair exists only in browser memory. If you:
- Close the tab
- Refresh the page
- Clear browser data

...the keypair is gone. Only the claim link remains.

## Next Steps

After creating a deposit:
1. [Bridge assets](/guide/bridging) from an EVM chain
2. Wait for funds to arrive
3. [Claim](/guide/claiming) to your destination wallet

