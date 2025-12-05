import { Keypair, PublicKey } from '@solana/web3.js';
import * as kp from './keypair';
import * as claim from './claim';
import * as evmWallet from './evm-wallet';
import * as solWallet from './solana-wallet';
import * as debridge from './debridge';
import { $, show, hide, copyToClipboard, showToast, formatAddress } from './ui';

function getNetworkBadge(): string {
  return claim.isMainnet() 
    ? '' 
    : '<span class="network-badge devnet">DEVNET</span>';
}

interface AppState {
  mode: 'home' | 'deposit' | 'claim';
  disposable: Keypair | null;
  balances: claim.Balances | null;
  stopPolling: (() => void) | null;
  evmConnected: boolean;
  selectedChain: number;
  quote: debridge.DeBridgeQuote | null;
  solWalletConnected: boolean;
}

const state: AppState = {
  mode: 'home',
  disposable: null,
  balances: null,
  stopPolling: null,
  evmConnected: false,
  selectedChain: 42161,
  quote: null,
  solWalletConnected: false,
};

function detectMode(): 'home' | 'claim' {
  const fragment = window.location.hash.slice(1);
  if (fragment && fragment.length > 40) {
    const keypair = kp.fromClaimFragment(fragment);
    if (keypair) {
      state.disposable = keypair;
      return 'claim';
    }
  }
  return 'home';
}

function renderHome() {
  const app = $('#app')!;
  app.innerHTML = `
    <div class="card">
      <div class="logo-header">
        <img src="/logo-minimal.svg" alt="Pridge" class="logo" />
        <h1>Pridge ${getNetworkBadge()}</h1>
      </div>
      <p class="subtitle">Private multichain to Solana transfers</p>
      
      <div class="section">
        <button id="btn-create" class="btn-primary">Create Private Deposit</button>
      </div>
      
      <div class="info-box">
        <p>1. Generate a disposable Solana address</p>
        <p>2. Connect wallet & bridge from any EVM chain</p>
        <p>3. Get a one-time claim link</p>
        <p>4. Anyone with the link can claim to any wallet</p>
      </div>
    </div>
  `;

  $('#btn-create')!.addEventListener('click', () => {
    state.disposable = kp.generate();
    state.mode = 'deposit';
    renderDeposit();
  });
}

function renderDeposit() {
  if (!state.disposable) return renderHome();

  const address = state.disposable.publicKey.toBase58();
  const claimUrl = kp.getClaimUrl(state.disposable);
  const wallet = evmWallet.getCurrentWallet();
  const chainEntries = Object.entries(evmWallet.SUPPORTED_CHAINS);

  const app = $('#app')!;
  app.innerHTML = `
    <div class="card">
      <div class="logo-header">
        <img src="/logo-minimal.svg" alt="Pridge" class="logo" />
        <h1>Pridge ${getNetworkBadge()}</h1>
      </div>
      
      <div class="warning-box">
        <p class="warning-title">Save your claim link first!</p>
        <div class="link-box">
          <input type="text" id="claim-url" value="${claimUrl}" readonly />
          <button id="btn-copy-link" class="btn-icon">Copy</button>
        </div>
        <p class="warning-text">Anyone with this link can claim the funds.</p>
      </div>
      
      <div class="divider"></div>
      
      <div class="bridge-section">
        <div class="destination-box">
          <span class="dest-label">Solana Destination</span>
          <code class="dest-address">${formatAddress(address)}</code>
          <button id="btn-copy-dest" class="btn-icon">Copy</button>
        </div>
        
        ${state.evmConnected && wallet ? `
          <div class="wallet-connected">
            <span class="wallet-dot"></span>
            <span>${formatAddress(wallet.address)}</span>
            <span class="wallet-chain">${evmWallet.SUPPORTED_CHAINS[wallet.chainId]?.name || 'Unknown'}</span>
          </div>
          
          <div class="bridge-form">
            <div class="form-row">
              <label>From Chain</label>
              <select id="chain-select">
                ${chainEntries.map(([id, c]) => `<option value="${id}" ${state.selectedChain === Number(id) ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            
            <div class="form-row">
              <label>Amount (Native Token)</label>
              <input type="number" id="amount-input" placeholder="0.01" step="any" value="0.005" />
            </div>
            
            <button id="btn-get-quote" class="btn-primary">Get Quote</button>
            
            <div id="quote-result" style="display: none;">
              <div class="quote-box">
                <div class="quote-row">
                  <span>You'll receive</span>
                  <span id="quote-receive" class="quote-value"></span>
                </div>
                <div class="quote-row">
                  <span>Protocol fee</span>
                  <span id="quote-fee" class="quote-fee"></span>
                </div>
              </div>
              <button id="btn-bridge" class="btn-success">Bridge Now</button>
            </div>
            
            <div id="bridge-status" style="display: none;">
              <div class="status-progress">
                <span class="spinner"></span>
                <span id="bridge-status-text">Processing...</span>
              </div>
            </div>
            
            <div id="bridge-success" style="display: none;">
              <div class="success-box">
                <span class="check">OK</span>
                <span>Bridge initiated!</span>
              </div>
              <a id="tx-explorer" href="#" target="_blank" class="explorer-link">View on Explorer</a>
              <p class="success-note">Funds will arrive in 1-5 minutes.</p>
            </div>
          </div>
        ` : `
          <button id="btn-connect" class="btn-primary btn-large">Connect MetaMask</button>
          <p class="connect-hint">Connect your EVM wallet to bridge</p>
        `}
      </div>
      
      <div class="divider"></div>
      
      <div class="status-section">
        <div id="status-waiting" class="status">
          <span class="spinner"></span>
          <span>Waiting for funds on Solana...</span>
        </div>
        <div id="status-received" class="status" style="display: none;">
          <span class="check">OK</span>
          <span>Funds received!</span>
        </div>
      </div>
      
      <div id="balance-display" style="display: none;">
        <div class="balance-list" id="balance-list"></div>
      </div>
      
      <button id="btn-back" class="btn-secondary">Back</button>
    </div>
  `;

  // Event listeners
  $('#btn-copy-link')!.addEventListener('click', async () => {
    await copyToClipboard(claimUrl);
    showToast('Claim link copied!');
  });

  $('#btn-copy-dest')?.addEventListener('click', async () => {
    await copyToClipboard(address);
    showToast('Address copied!');
  });

  $('#btn-back')!.addEventListener('click', () => {
    if (state.stopPolling) state.stopPolling();
    state.disposable = null;
    state.balances = null;
    state.evmConnected = false;
    state.quote = null;
    state.mode = 'home';
    renderHome();
  });

  // Connect wallet button
  $('#btn-connect')?.addEventListener('click', async () => {
    try {
      await evmWallet.connectWallet();
      state.evmConnected = true;
      const w = evmWallet.getCurrentWallet();
      if (w) state.selectedChain = w.chainId;
      renderDeposit();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to connect');
    }
  });

  // Chain selector
  $('#chain-select')?.addEventListener('change', async (e) => {
    const chainId = parseInt((e.target as HTMLSelectElement).value);
    state.selectedChain = chainId;
    state.quote = null;
    hide($('#quote-result'));
    
    // Switch chain in MetaMask
    try {
      await evmWallet.switchChain(chainId);
    } catch (err) {
      showToast('Failed to switch chain');
    }
  });

  // Get quote button
  $('#btn-get-quote')?.addEventListener('click', async () => {
    const amountInput = $('#amount-input') as HTMLInputElement;
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount');
      return;
    }

    const btn = $('#btn-get-quote') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Getting quote...';

    try {
      const decimals = 18;
      const amountWei = BigInt(Math.floor(amount * 10 ** decimals)).toString();

      console.log('Getting quote:', { chain: state.selectedChain, amount: amountWei, dest: address });

      const quote = await debridge.getQuote({
        srcChainId: state.selectedChain,
        srcTokenAddress: debridge.NATIVE_TOKEN,
        amount: amountWei,
        dstChainId: debridge.SOLANA_CHAIN_ID,
        dstTokenAddress: debridge.SOLANA_NATIVE_SOL,
        dstAddress: address,
        srcAddress: wallet?.address || '',
      });

      if (!quote) {
        throw new Error('No quote available');
      }

      state.quote = quote;

      // Display quote
      const receiveAmount = parseFloat(quote.estimation.dstChainTokenOut.amount) / 1e9;
      $('#quote-receive')!.textContent = `~${receiveAmount.toFixed(6)} SOL`;
      
      const fixFee = parseFloat(quote.fixFee || '0');
      const percentFee = parseFloat(quote.percentFee || '0');
      $('#quote-fee')!.textContent = `${(fixFee + percentFee).toFixed(6)} (protocol)`;

      show($('#quote-result'));
    } catch (e) {
      console.error('Quote error:', e);
      showToast(e instanceof Error ? e.message : 'Failed to get quote');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Get Quote';
    }
  });

  // Bridge button
  $('#btn-bridge')?.addEventListener('click', async () => {
    if (!state.quote || !state.disposable) return;

    const wallet = evmWallet.getCurrentWallet();
    if (!wallet) {
      showToast('Wallet not connected');
      return;
    }

    const btn = $('#btn-bridge') as HTMLButtonElement;
    btn.disabled = true;
    hide($('#quote-result'));
    show($('#bridge-status'));
    $('#bridge-status-text')!.textContent = 'Creating transaction...';

    try {
      // Create the transaction
      const txQuote = await debridge.createTransaction({
        srcChainId: state.selectedChain,
        srcTokenAddress: debridge.NATIVE_TOKEN,
        amount: state.quote.estimation.srcChainTokenIn.amount,
        dstChainId: debridge.SOLANA_CHAIN_ID,
        dstTokenAddress: debridge.SOLANA_NATIVE_SOL,
        dstAddress: state.disposable.publicKey.toBase58(),
        srcAddress: wallet.address,
      });

      if (!txQuote) {
        throw new Error('Failed to create transaction');
      }

      $('#bridge-status-text')!.textContent = 'Confirm in MetaMask...';

      // Execute the bridge
      const txHash = await debridge.executeBridge(wallet, txQuote);

      hide($('#bridge-status'));
      show($('#bridge-success'));
      
      const chain = evmWallet.SUPPORTED_CHAINS[state.selectedChain];
      const explorerLink = $('#tx-explorer') as HTMLAnchorElement;
      explorerLink.href = `${chain.explorer}/tx/${txHash}`;
      
      // Add deBridge tracking link
      if (txQuote.orderId) {
        const trackLink = document.createElement('a');
        trackLink.href = `https://app.debridge.finance/order?orderId=${txQuote.orderId}`;
        trackLink.target = '_blank';
        trackLink.className = 'explorer-link';
        trackLink.textContent = 'Track on deBridge';
        $('#bridge-success')?.parentElement?.appendChild(trackLink);
      }

      state.quote = null;
    } catch (e) {
      console.error('Bridge error:', e);
      hide($('#bridge-status'));
      show($('#quote-result'));
      btn.disabled = false;
      showToast(e instanceof Error ? e.message : 'Bridge failed');
    }
  });

  startPolling();
}

async function startPolling() {
  if (!state.disposable) return;

  const stop = await claim.pollForFunds(
    state.disposable.publicKey,
    (balances) => {
      state.balances = balances;
      updateBalanceDisplay();
    },
    4000
  );
  state.stopPolling = stop;
}

function updateBalanceDisplay() {
  const balances = state.balances;
  if (!balances) return;

  const hasBalance = balances.sol > 0.0001 || balances.tokens.length > 0;

  if (hasBalance) {
    hide($('#status-waiting'));
    show($('#status-received'));
    show($('#balance-display'));
    hide($('#bridge-status'));

    const list = $('#balance-list')!;
    list.innerHTML = '';

    if (balances.sol > 0.0001) {
      list.innerHTML += `<div class="balance-item"><span>SOL</span><span>${balances.sol.toFixed(6)}</span></div>`;
    }

    for (const token of balances.tokens) {
      list.innerHTML += `<div class="balance-item"><span>${formatAddress(token.mint)}</span><span>${token.uiAmount.toFixed(token.decimals > 6 ? 6 : token.decimals)}</span></div>`;
    }
  }
}

function renderClaim() {
  if (!state.disposable) return renderHome();

  const address = state.disposable.publicKey.toBase58();
  const connectedWallet = solWallet.getCurrentWallet();

  const app = $('#app')!;
  app.innerHTML = `
    <div class="card">
      <h1>Claim Your Funds ${getNetworkBadge()}</h1>
      <p class="subtitle">From: ${formatAddress(address)}</p>
      
      <div id="loading-balances" class="status">
        <span class="spinner"></span>
        <span>Loading balances...</span>
      </div>
      
      <div id="balance-display" style="display: none;">
        <p class="label">Available:</p>
        <div class="balance-list" id="balance-list"></div>
      </div>
      
      <div id="no-sol-warning" class="warning-box" style="display: none;">
        <p class="warning-title">⚠️ No SOL for fees</p>
        <p class="warning-text">The disposable address has tokens but no SOL for transaction fees. Connect your Phantom wallet to pay fees automatically.</p>
      </div>
      
      <div id="empty-notice" style="display: none;">
        <p class="warning">No funds found in this address.</p>
      </div>
      
      <div class="divider"></div>
      
      <div id="wallet-section">
        ${state.solWalletConnected && connectedWallet ? `
          <div class="wallet-connected">
            <span class="wallet-dot"></span>
            <span>Phantom: ${solWallet.formatAddress(connectedWallet.publicKey)}</span>
            <button id="btn-disconnect-sol" class="btn-small">Disconnect</button>
          </div>
          <p class="fee-note">✓ Your wallet will pay the transaction fee (~0.00025 SOL)</p>
        ` : `
          <button id="btn-connect-phantom" class="btn-secondary">Connect Phantom (Pay Fees)</button>
          <p class="connect-hint">Or enter any Solana address below</p>
        `}
      </div>
      
      <div class="input-group">
        <label for="dest-address">Destination Wallet:</label>
        <input type="text" id="dest-address" placeholder="Enter Solana address..." value="${connectedWallet ? connectedWallet.publicKey.toBase58() : ''}" />
      </div>
      
      <button id="btn-claim" class="btn-primary" disabled>Claim All</button>
      
      <div id="claim-status" style="display: none;">
        <div class="status" id="claiming">
          <span class="spinner"></span>
          <span id="claim-status-text">Claiming...</span>
        </div>
        <div class="status success" id="claim-success" style="display: none;">
          <span class="check">✓</span>
          <span>Claimed successfully!</span>
        </div>
        <a id="tx-link" href="#" target="_blank" rel="noopener" style="display: none;">View transaction</a>
      </div>
    </div>
  `;

  const destInput = $('#dest-address') as HTMLInputElement;
  const claimBtn = $('#btn-claim') as HTMLButtonElement;

  // Enable claim button if valid address
  const validateAddress = () => {
    try {
      new PublicKey(destInput.value.trim());
      claimBtn.disabled = false;
    } catch {
      claimBtn.disabled = true;
    }
  };
  
  destInput.addEventListener('input', validateAddress);
  validateAddress(); // Check initial value

  // Connect Phantom button
  $('#btn-connect-phantom')?.addEventListener('click', async () => {
    try {
      const wallet = await solWallet.connectWallet();
      state.solWalletConnected = true;
      destInput.value = wallet.publicKey.toBase58();
      renderClaim(); // Re-render with connected state
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to connect Phantom');
    }
  });

  // Disconnect button
  $('#btn-disconnect-sol')?.addEventListener('click', () => {
    solWallet.disconnectWallet();
    state.solWalletConnected = false;
    renderClaim();
  });

  // Claim button
  claimBtn.addEventListener('click', async () => {
    if (!state.disposable) return;

    const dest = destInput.value.trim();
    let destPubkey: PublicKey;
    try {
      destPubkey = new PublicKey(dest);
    } catch {
      showToast('Invalid address');
      return;
    }

    show($('#claim-status'));
    show($('#claiming'));
    claimBtn.disabled = true;
    destInput.disabled = true;

    try {
      // Check if we need external fee payer
      const balances = state.balances;
      const needsFeePayer = balances && balances.sol < 0.001 && balances.tokens.length > 0;
      
      let claimOptions: claim.ClaimOptions | undefined;
      
      if (needsFeePayer) {
        // Try to use connected Phantom wallet
        let wallet = solWallet.getCurrentWallet();
        
        if (!wallet) {
          $('#claim-status-text')!.textContent = 'Connect Phantom to pay fees...';
          wallet = await solWallet.connectWallet();
          state.solWalletConnected = true;
        }
        
        $('#claim-status-text')!.textContent = 'Sign in Phantom...';
        
        claimOptions = {
          feePayer: {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
          }
        };
      } else {
        $('#claim-status-text')!.textContent = 'Claiming...';
      }

      const sig = await claim.claimAll(state.disposable, destPubkey, claimOptions);
      hide($('#claiming'));
      show($('#claim-success'));
      
      const txLink = $('#tx-link') as HTMLAnchorElement;
      txLink.href = `https://solscan.io/tx/${sig}`;
      show(txLink);
    } catch (e) {
      hide($('#claiming'));
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      showToast(`Claim failed: ${errorMsg}`);
      claimBtn.disabled = false;
      destInput.disabled = false;
    }
  });

  loadClaimBalances();
}

async function loadClaimBalances() {
  if (!state.disposable) return;

  try {
    const balances = await claim.getBalances(state.disposable.publicKey);
    state.balances = balances;

    hide($('#loading-balances'));

    const hasBalance = balances.sol > 0.0001 || balances.tokens.length > 0;
    const hasTokensNoSol = balances.tokens.length > 0 && balances.sol < 0.001;

    if (hasBalance) {
      show($('#balance-display'));

      const list = $('#balance-list')!;
      list.innerHTML = '';

      if (balances.sol > 0.0001) {
        list.innerHTML += `<div class="balance-item"><span>SOL</span><span>${balances.sol.toFixed(6)}</span></div>`;
      }

      for (const token of balances.tokens) {
        // Show friendly name for wSOL
        const name = token.mint === 'So11111111111111111111111111111111111111112' 
          ? 'Wrapped SOL' 
          : formatAddress(token.mint);
        list.innerHTML += `<div class="balance-item"><span>${name}</span><span>${token.uiAmount.toFixed(token.decimals > 6 ? 6 : token.decimals)}</span></div>`;
      }
      
      // Show warning if tokens but no SOL for fees
      if (hasTokensNoSol && !state.solWalletConnected) {
        show($('#no-sol-warning'));
      }
    } else {
      show($('#empty-notice'));
    }
  } catch (e) {
    hide($('#loading-balances'));
    show($('#empty-notice'));
    console.error('Failed to load balances:', e);
  }
}

function init() {
  route();

  window.addEventListener('hashchange', route);

  window.addEventListener('beforeunload', (e) => {
    if (state.mode === 'deposit' && state.disposable) {
      e.preventDefault();
      e.returnValue = 'You have an active deposit session. Make sure you copied the claim link!';
    }
  });
}

function route() {
  if (state.stopPolling) {
    state.stopPolling();
    state.stopPolling = null;
  }

  const mode = detectMode();
  state.mode = mode;

  if (mode === 'claim') {
    renderClaim();
  } else {
    state.disposable = null;
    state.balances = null;
    renderHome();
  }
}

document.addEventListener('DOMContentLoaded', init);
