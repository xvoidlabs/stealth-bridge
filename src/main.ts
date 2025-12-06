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

function getFooter(): string {
  return `
    <footer class="site-footer">
      <div class="footer-links">
        <a href="https://x.com/pridgeio" target="_blank" rel="noopener" class="footer-link" title="Twitter/X">
          <svg viewBox="0 0 24 24" fill="currentColor" class="footer-icon">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <a href="https://github.com/xvoidlabs/pridge" target="_blank" rel="noopener" class="footer-link" title="GitHub">
          <svg viewBox="0 0 24 24" fill="currentColor" class="footer-icon">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <a href="https://docs.pridge.io" target="_blank" rel="noopener" class="footer-link" title="Documentation">
          <svg viewBox="0 0 24 24" fill="currentColor" class="footer-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6zm2-6h8v2H8v-2zm0-4h8v2H8v-2zm0 8h5v2H8v-2z"/>
          </svg>
        </a>
      </div>
      <p class="footer-text">Privacy-first cross-chain bridge</p>
    </footer>
  `;
}

interface SplitDest {
  address: string;
  percentage: number;
}

interface AppState {
  mode: 'home' | 'deposit' | 'claim';
  disposable: Keypair | null;
  balances: claim.Balances | null;
  stopPolling: (() => void) | null;
  evmConnected: boolean;
  selectedChain: number;
  selectedToken: string;
  quote: debridge.DeBridgeQuote | null;
  solWalletConnected: boolean;
  expiresAt: number | null; // Unix timestamp for claim expiration
  splitMode: boolean;
  splitDestinations: SplitDest[];
}

const state: AppState = {
  mode: 'home',
  disposable: null,
  balances: null,
  stopPolling: null,
  evmConnected: false,
  selectedChain: 42161,
  selectedToken: 'NATIVE',
  quote: null,
  solWalletConnected: false,
  expiresAt: null,
  splitMode: false,
  splitDestinations: [{ address: '', percentage: 100 }],
};

function detectMode(): 'home' | 'claim' {
  const fragment = window.location.hash.slice(1);
  if (fragment && fragment.length > 40) {
    const claimData = kp.fromClaimFragment(fragment);
    if (claimData) {
      state.disposable = claimData.keypair;
      state.expiresAt = claimData.expiresAt;
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
        <img src="/logo.png" alt="Pridge" class="logo" />
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
    ${getFooter()}
  `;

  $('#btn-create')!.addEventListener('click', () => {
    state.disposable = kp.generate();
    state.mode = 'deposit';
    renderDeposit();
  });
}

// Expiration options in seconds
const EXPIRATION_OPTIONS = [
  { label: 'Never', value: 0 },
  { label: '1 hour', value: 3600 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 },
];

function renderDeposit() {
  if (!state.disposable) return renderHome();

  const address = state.disposable.publicKey.toBase58();
  const claimUrl = kp.getClaimUrl(state.disposable, state.expiresAt);
  const wallet = evmWallet.getCurrentWallet();
  const chainEntries = Object.entries(evmWallet.SUPPORTED_CHAINS);

  // Format expiration for display
  const expirationText = state.expiresAt 
    ? new Date(state.expiresAt * 1000).toLocaleString()
    : 'Never';

  const app = $('#app')!;
  app.innerHTML = `
    <div class="card">
      <div class="logo-header">
        <img src="/logo.png" alt="Pridge" class="logo" />
        <h1>Pridge ${getNetworkBadge()}</h1>
      </div>
      
      <div class="warning-box">
        <p class="warning-title">Save your claim link first!</p>
        <div class="link-box">
          <input type="text" id="claim-url" value="${claimUrl}" readonly />
          <button id="btn-copy-link" class="btn-icon">Copy</button>
        </div>
        <p class="warning-text">Anyone with this link can claim the funds.</p>
        <div class="expiration-row">
          <label>Link expires:</label>
          <select id="expiration-select">
            ${EXPIRATION_OPTIONS.map(opt => {
              const isSelected = state.expiresAt 
                ? (opt.value > 0 && state.expiresAt === Math.floor(Date.now() / 1000) + opt.value)
                : opt.value === 0;
              return `<option value="${opt.value}" ${isSelected ? 'selected' : ''}>${opt.label}</option>`;
            }).join('')}
          </select>
          <span id="expiration-display" class="expiration-display">${state.expiresAt ? `(${expirationText})` : ''}</span>
        </div>
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
              <label>Token</label>
              <select id="token-select">
                ${Object.entries(debridge.SUPPORTED_TOKENS)
                  .filter(([, t]) => debridge.isTokenSupported(t.symbol === 'NATIVE' ? 'NATIVE' : t.symbol, state.selectedChain))
                  .map(([key, t]) => {
                    const label = key === 'NATIVE' ? debridge.getNativeTokenName(state.selectedChain) : t.symbol;
                    return `<option value="${key}" ${state.selectedToken === key ? 'selected' : ''}>${label}</option>`;
                  }).join('')}
              </select>
            </div>
            
            <div class="form-row">
              <label>Amount <span id="token-balance-hint" class="balance-hint"></span></label>
              <input type="number" id="amount-input" placeholder="0.01" step="any" value="${state.selectedToken === 'NATIVE' ? '0.005' : '10'}" />
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
    const currentUrl = kp.getClaimUrl(state.disposable!, state.expiresAt);
    await copyToClipboard(currentUrl);
    showToast('Claim link copied!');
  });

  $('#btn-copy-dest')?.addEventListener('click', async () => {
    await copyToClipboard(address);
    showToast('Address copied!');
  });

  // Expiration selector
  $('#expiration-select')?.addEventListener('change', (e) => {
    const seconds = parseInt((e.target as HTMLSelectElement).value);
    if (seconds > 0) {
      state.expiresAt = Math.floor(Date.now() / 1000) + seconds;
      const expirationDate = new Date(state.expiresAt * 1000).toLocaleString();
      $('#expiration-display')!.textContent = `(${expirationDate})`;
    } else {
      state.expiresAt = null;
      $('#expiration-display')!.textContent = '';
    }
    // Update the claim URL input
    const newUrl = kp.getClaimUrl(state.disposable!, state.expiresAt);
    ($('#claim-url') as HTMLInputElement).value = newUrl;
  });

  $('#btn-back')!.addEventListener('click', () => {
    if (state.stopPolling) state.stopPolling();
    state.disposable = null;
    state.balances = null;
    state.evmConnected = false;
    state.quote = null;
    state.expiresAt = null;
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
    
    // Check if current token is supported on new chain
    if (!debridge.isTokenSupported(state.selectedToken, chainId)) {
      state.selectedToken = 'NATIVE';
    }
    
    // Switch chain in MetaMask
    try {
      await evmWallet.switchChain(chainId);
      renderDeposit(); // Re-render to update token options
    } catch (err) {
      showToast('Failed to switch chain');
    }
  });

  // Token selector
  $('#token-select')?.addEventListener('change', async (e) => {
    const tokenSymbol = (e.target as HTMLSelectElement).value;
    state.selectedToken = tokenSymbol;
    state.quote = null;
    hide($('#quote-result'));
    
    // Update amount placeholder based on token
    const amountInput = $('#amount-input') as HTMLInputElement;
    amountInput.value = tokenSymbol === 'NATIVE' ? '0.005' : '10';
    
    // Load token balance
    updateTokenBalance();
  });

  // Load initial token balance
  updateTokenBalance();

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
      const tokenInfo = debridge.SUPPORTED_TOKENS[state.selectedToken];
      if (!tokenInfo) throw new Error('Invalid token');

      const srcTokenAddress = debridge.getTokenAddress(state.selectedToken, state.selectedChain);
      if (!srcTokenAddress) throw new Error('Token not supported on this chain');

      const decimals = tokenInfo.decimals;
      const amountWei = BigInt(Math.floor(amount * 10 ** decimals)).toString();

      console.log('Getting quote:', { 
        chain: state.selectedChain, 
        token: state.selectedToken,
        amount: amountWei, 
        dest: address 
      });

      const quote = await debridge.getQuote({
        srcChainId: state.selectedChain,
        srcTokenAddress: srcTokenAddress,
        amount: amountWei,
        dstChainId: debridge.SOLANA_CHAIN_ID,
        dstTokenAddress: tokenInfo.solanaAddress,
        dstAddress: address,
        srcAddress: wallet?.address || '',
        tokenSymbol: state.selectedToken,
      });

      if (!quote) {
        throw new Error('No quote available');
      }

      state.quote = quote;

      // Display quote - use correct decimals for destination token
      const dstDecimals = state.selectedToken === 'NATIVE' ? 9 : 6; // SOL = 9, USDC/USDT = 6
      const receiveAmount = parseFloat(quote.estimation.dstChainTokenOut.amount) / Math.pow(10, dstDecimals);
      const receiveSymbol = state.selectedToken === 'NATIVE' ? 'SOL' : state.selectedToken;
      $('#quote-receive')!.textContent = `~${receiveAmount.toFixed(6)} ${receiveSymbol}`;
      
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

    try {
      const tokenInfo = debridge.SUPPORTED_TOKENS[state.selectedToken];
      if (!tokenInfo) throw new Error('Invalid token');

      const srcTokenAddress = debridge.getTokenAddress(state.selectedToken, state.selectedChain);
      if (!srcTokenAddress) throw new Error('Token not supported');

      $('#bridge-status-text')!.textContent = 'Creating transaction...';

      // Create the transaction FIRST to get the spender address (tx.to)
      const txQuote = await debridge.createTransaction({
        srcChainId: state.selectedChain,
        srcTokenAddress: srcTokenAddress,
        amount: state.quote.estimation.srcChainTokenIn.amount,
        dstChainId: debridge.SOLANA_CHAIN_ID,
        dstTokenAddress: tokenInfo.solanaAddress,
        dstAddress: state.disposable.publicKey.toBase58(),
        srcAddress: wallet.address,
        tokenSymbol: state.selectedToken,
      });

      if (!txQuote) {
        throw new Error('Failed to create transaction');
      }

      // Check if token approval is needed (for ERC-20 tokens)
      // Use tx.to from the quote as the spender address
      if (state.selectedToken !== 'NATIVE') {
        $('#bridge-status-text')!.textContent = 'Checking approval...';
        
        const spender = txQuote.tx.to; // The deBridge contract address
        const hasAllowance = await debridge.checkAllowance(
          wallet,
          srcTokenAddress,
          spender,
          state.quote.estimation.srcChainTokenIn.amount
        );

        if (!hasAllowance) {
          $('#bridge-status-text')!.textContent = 'Approve token in MetaMask...';
          
          // Request unlimited approval
          const maxApproval = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
          await debridge.approveToken(wallet, srcTokenAddress, spender, maxApproval);
          
          showToast('Token approved!');
        }
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

async function updateTokenBalance() {
  const wallet = evmWallet.getCurrentWallet();
  if (!wallet) return;

  const tokenInfo = debridge.SUPPORTED_TOKENS[state.selectedToken];
  if (!tokenInfo) return;

  const hint = $('#token-balance-hint');
  if (!hint) return;

  try {
    hint.textContent = '(loading...)';
    const tokenAddress = debridge.getTokenAddress(state.selectedToken, wallet.chainId);
    if (!tokenAddress) {
      hint.textContent = '';
      return;
    }

    const balance = await debridge.getTokenBalance(wallet, tokenAddress);
    const formatted = parseFloat(balance) / Math.pow(10, tokenInfo.decimals);
    const symbol = state.selectedToken === 'NATIVE' 
      ? debridge.getNativeTokenName(wallet.chainId) 
      : tokenInfo.symbol;
    hint.textContent = `(Balance: ${formatted.toFixed(4)} ${symbol})`;
  } catch (e) {
    console.error('Failed to get balance:', e);
    hint.textContent = '';
  }
}

let expirationInterval: ReturnType<typeof setInterval> | null = null;

function renderClaim() {
  if (!state.disposable) return renderHome();

  // Clear any existing expiration interval
  if (expirationInterval) {
    clearInterval(expirationInterval);
    expirationInterval = null;
  }

  const address = state.disposable.publicKey.toBase58();
  const connectedWallet = solWallet.getCurrentWallet();
  const timeInfo = kp.getTimeRemaining(state.expiresAt);
  const isLinkExpired = timeInfo.expired;

  const app = $('#app')!;
  app.innerHTML = `
    <div class="card">
      <h1>Claim Your Funds ${getNetworkBadge()}</h1>
      <p class="subtitle">From: ${formatAddress(address)}</p>
      
      ${state.expiresAt ? `
        <div id="expiration-banner" class="expiration-banner ${isLinkExpired ? 'expired' : ''}">
          <span class="expiration-icon">${isLinkExpired ? 'X' : 'i'}</span>
          <span id="expiration-text">${timeInfo.text}</span>
        </div>
      ` : ''}
      
      ${isLinkExpired ? `
        <div class="expired-notice">
          <p class="expired-title">This claim link has expired</p>
          <p class="expired-text">The funds may still be in the disposable address, but this link is no longer valid for claiming.</p>
        </div>
      ` : `
        <div id="loading-balances" class="status">
          <span class="spinner"></span>
          <span>Loading balances...</span>
        </div>
        
        <div id="balance-display" style="display: none;">
          <p class="label">Available:</p>
          <div class="balance-list" id="balance-list"></div>
        </div>
        
        <div id="no-sol-warning" class="warning-box" style="display: none;">
          <p class="warning-title">No SOL for fees</p>
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
            <p class="fee-note">Your wallet will pay the transaction fee (~0.00025 SOL)</p>
          ` : `
            <button id="btn-connect-phantom" class="btn-secondary">Connect Phantom (Pay Fees)</button>
            <p class="connect-hint">Or enter any Solana address below</p>
          `}
        </div>
        
        <div class="split-toggle">
          <label class="toggle-label">
            <input type="checkbox" id="split-mode-toggle" ${state.splitMode ? 'checked' : ''} />
            <span class="toggle-text">Split to multiple wallets</span>
          </label>
        </div>
        
        <div id="single-dest" style="${state.splitMode ? 'display: none;' : ''}">
          <div class="input-group">
            <label for="dest-address">Destination Wallet:</label>
            <input type="text" id="dest-address" placeholder="Enter Solana address..." value="${connectedWallet ? connectedWallet.publicKey.toBase58() : ''}" />
          </div>
        </div>
        
        <div id="split-dest" style="${state.splitMode ? '' : 'display: none;'}">
          <div class="split-header">
            <span class="label">Split Destinations</span>
            <button id="btn-add-dest" class="btn-icon-small">+ Add</button>
          </div>
          <div id="split-list">
            ${state.splitDestinations.map((d, i) => `
              <div class="split-row" data-index="${i}">
                <input type="text" class="split-address" placeholder="Solana address..." value="${d.address}" />
                <input type="number" class="split-percent" min="1" max="100" value="${d.percentage}" />
                <span class="percent-sign">%</span>
                ${state.splitDestinations.length > 1 ? `<button class="btn-remove-dest btn-icon-small">X</button>` : ''}
              </div>
            `).join('')}
          </div>
          <div id="split-total" class="split-total">
            Total: <span id="total-percent">${state.splitDestinations.reduce((sum, d) => sum + d.percentage, 0)}</span>%
          </div>
        </div>
        
        <button id="btn-claim" class="btn-primary" disabled>Claim All</button>
        
        <div id="claim-status" style="display: none;">
          <div class="status" id="claiming">
            <span class="spinner"></span>
            <span id="claim-status-text">Claiming...</span>
          </div>
          <div class="status success" id="claim-success" style="display: none;">
            <span class="check">OK</span>
            <span>Claimed successfully!</span>
          </div>
          <a id="tx-link" href="#" target="_blank" rel="noopener" style="display: none;">View transaction</a>
        </div>
      `}
    </div>
  `;

  // Don't proceed if expired
  if (isLinkExpired) return;

  const destInput = $('#dest-address') as HTMLInputElement;
  const claimBtn = $('#btn-claim') as HTMLButtonElement;

  // Validate based on mode
  const validateClaim = () => {
    if (state.splitMode) {
      // Validate all split destinations
      const valid = state.splitDestinations.every(d => {
        try {
          new PublicKey(d.address.trim());
          return d.percentage > 0;
        } catch {
          return false;
        }
      });
      const totalPercent = state.splitDestinations.reduce((sum, d) => sum + d.percentage, 0);
      claimBtn.disabled = !valid || Math.abs(totalPercent - 100) > 0.01;
      
      // Update total display
      const totalEl = $('#total-percent');
      if (totalEl) {
        totalEl.textContent = totalPercent.toString();
        totalEl.parentElement?.classList.toggle('invalid', Math.abs(totalPercent - 100) > 0.01);
      }
    } else {
      // Single destination mode
      try {
        new PublicKey(destInput?.value?.trim() || '');
        claimBtn.disabled = false;
      } catch {
        claimBtn.disabled = true;
      }
    }
  };
  
  destInput?.addEventListener('input', validateClaim);
  validateClaim(); // Check initial value

  // Split mode toggle
  $('#split-mode-toggle')?.addEventListener('change', (e) => {
    state.splitMode = (e.target as HTMLInputElement).checked;
    
    // If switching to split mode, initialize with connected wallet if available
    if (state.splitMode && state.splitDestinations[0].address === '' && connectedWallet) {
      state.splitDestinations[0].address = connectedWallet.publicKey.toBase58();
    }
    
    renderClaim();
  });

  // Add destination button
  $('#btn-add-dest')?.addEventListener('click', () => {
    if (state.splitDestinations.length >= 10) {
      showToast('Maximum 10 destinations');
      return;
    }
    
    // Calculate remaining percentage
    const used = state.splitDestinations.reduce((sum, d) => sum + d.percentage, 0);
    const remaining = Math.max(0, 100 - used);
    
    state.splitDestinations.push({ address: '', percentage: remaining });
    renderClaim();
  });

  // Remove destination buttons
  document.querySelectorAll('.btn-remove-dest').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest('.split-row');
      const index = parseInt(row?.getAttribute('data-index') || '0');
      state.splitDestinations.splice(index, 1);
      
      // Redistribute percentage to first destination
      if (state.splitDestinations.length === 1) {
        state.splitDestinations[0].percentage = 100;
      }
      
      renderClaim();
    });
  });

  // Split address/percentage inputs
  document.querySelectorAll('.split-address').forEach((input, i) => {
    input.addEventListener('input', (e) => {
      state.splitDestinations[i].address = (e.target as HTMLInputElement).value;
      validateClaim();
    });
  });

  document.querySelectorAll('.split-percent').forEach((input, i) => {
    input.addEventListener('input', (e) => {
      state.splitDestinations[i].percentage = parseInt((e.target as HTMLInputElement).value) || 0;
      validateClaim();
    });
  });

  // Connect Phantom button
  $('#btn-connect-phantom')?.addEventListener('click', async () => {
    try {
      const wallet = await solWallet.connectWallet();
      state.solWalletConnected = true;
      if (destInput) destInput.value = wallet.publicKey.toBase58();
      if (state.splitMode && state.splitDestinations[0].address === '') {
        state.splitDestinations[0].address = wallet.publicKey.toBase58();
      }
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

    // Validate destinations based on mode
    let destinations: claim.SplitDestination[];
    
    if (state.splitMode) {
      // Split mode - multiple destinations
      try {
        destinations = state.splitDestinations.map(d => ({
          address: new PublicKey(d.address.trim()),
          percentage: d.percentage,
        }));
      } catch {
        showToast('Invalid address in split destinations');
        return;
      }
      
      const totalPercent = destinations.reduce((sum, d) => sum + d.percentage, 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        showToast('Percentages must equal 100%');
        return;
      }
    } else {
      // Single destination mode
      const dest = destInput.value.trim();
      try {
        destinations = [{ address: new PublicKey(dest), percentage: 100 }];
      } catch {
        showToast('Invalid address');
        return;
      }
    }

    show($('#claim-status'));
    show($('#claiming'));
    claimBtn.disabled = true;
    if (destInput) destInput.disabled = true;

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
        $('#claim-status-text')!.textContent = state.splitMode ? 'Splitting funds...' : 'Claiming...';
      }

      // Use claimSplit for all claims (handles both single and multiple destinations)
      const sig = await claim.claimSplit(state.disposable, destinations, claimOptions);
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
      if (destInput) destInput.disabled = false;
    }
  });

  // Start expiration countdown timer if applicable
  if (state.expiresAt && !kp.isExpired(state.expiresAt)) {
    expirationInterval = setInterval(() => {
      const timeInfo = kp.getTimeRemaining(state.expiresAt);
      const expirationText = $('#expiration-text');
      const expirationBanner = $('#expiration-banner');
      
      if (expirationText) {
        expirationText.textContent = timeInfo.text;
      }
      
      if (timeInfo.expired) {
        // Link just expired - re-render to show expired state
        if (expirationInterval) {
          clearInterval(expirationInterval);
          expirationInterval = null;
        }
        if (expirationBanner) {
          expirationBanner.classList.add('expired');
        }
        showToast('This claim link has expired');
        renderClaim();
      }
    }, 1000);
  }

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
