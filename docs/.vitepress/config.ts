import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Pridge',
  description: 'Privacy-preserving multichain-to-Solana bridge',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#00d9ff' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Security', link: '/security' },
      { text: 'Roadmap', link: '/roadmap' },
      { text: 'App', link: 'https://pridge.io' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Pridge?', link: '/guide/what-is-pridge' },
          { text: 'How It Works', link: '/guide/how-it-works' },
          { text: 'Getting Started', link: '/guide/getting-started' }
        ]
      },
      {
        text: 'Using Pridge',
        items: [
          { text: 'Creating a Deposit', link: '/guide/creating-deposit' },
          { text: 'Bridging Assets', link: '/guide/bridging' },
          { text: 'Claiming Funds', link: '/guide/claiming' },
          { text: 'Supported Chains', link: '/guide/supported-chains' }
        ]
      },
      {
        text: 'Technical',
        items: [
          { text: 'Architecture', link: '/technical/architecture' },
          { text: 'Security Model', link: '/security' },
          { text: 'FAQ', link: '/faq' }
        ]
      },
      {
        text: 'Project',
        items: [
          { text: 'Roadmap', link: '/roadmap' },
          { text: 'Contributing', link: '/contributing' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'x', link: 'https://x.com/pridgeio' },
      { icon: 'github', link: 'https://github.com/xvoidlabs/stealth-bridge' }
    ],

    footer: {
      message: 'Privacy-first cross-chain bridge',
      copyright: 'MIT License'
    },

    search: {
      provider: 'local'
    }
  }
})

