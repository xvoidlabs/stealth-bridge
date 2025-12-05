# Contributing

Pridge is open source and welcomes contributions.

## Repository

```bash
git clone https://github.com/xvoidlabs/pridge
cd pridge
```

## Development Setup

### Main App

```bash
# Install dependencies
npm install

# Create environment file
cp env.example .env
# Add your Helius API key

# Start dev server
npm run dev
```

### Documentation

```bash
cd docs
npm install
npm run dev
```

## Project Structure

```
stealth-bridge/
├── src/
│   ├── main.ts          # App entry, routing
│   ├── keypair.ts       # Key generation
│   ├── claim.ts         # Claim logic
│   ├── debridge.ts      # Bridge API
│   ├── evm-wallet.ts    # MetaMask
│   ├── solana-wallet.ts # Phantom
│   └── ui.ts            # Utilities
├── docs/                # Documentation site
├── public/              # Static assets
└── style.css            # Styles
```

## Contribution Areas

### Code

- Bug fixes
- New features
- Performance improvements
- Test coverage

### Documentation

- Fix typos
- Improve explanations
- Add examples
- Translate to other languages

### Design

- UI improvements
- Logo variations
- Social assets

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit PR with description

### PR Guidelines

- Keep changes focused
- Update documentation if needed
- Follow existing code style
- Test on mainnet before submitting

## Code Style

- TypeScript strict mode
- No `any` types where avoidable
- Meaningful variable names
- Comments for complex logic

## Issues

Found a bug or have an idea?

1. Check existing issues
2. Open new issue with details
3. Use appropriate labels

## Security

Found a vulnerability?

**Do not** open a public issue. Contact us privately via [Twitter DM](https://x.com/pridgeio).

## License

All contributions are MIT licensed.

