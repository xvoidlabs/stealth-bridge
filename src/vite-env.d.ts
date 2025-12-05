/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HELIUS_API_KEY: string;
  readonly VITE_SOLANA_MAINNET_RPC?: string;
  readonly VITE_SOLANA_DEVNET_RPC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

