# Contributing to @openclaw/lark

Thank you for your interest in contributing to the OpenClaw Lark channel plugin!

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/openclaw-lark-channel.git
   cd openclaw-lark-channel
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build:
   ```bash
   npm run build
   ```

## Development

### Project Structure

```
├── src/
│   ├── channel.ts      # Main channel plugin implementation
│   ├── client.ts       # Lark API client
│   ├── webhook.ts      # Webhook server for receiving messages
│   ├── queue.ts        # SQLite-backed message queue
│   ├── card-builder.ts # Interactive card construction
│   ├── config-schema.ts # Zod schemas for configuration
│   ├── types.ts        # TypeScript type definitions
│   └── utils.ts        # Utility functions
├── test/               # Test files
├── docs/               # Documentation
└── index.ts            # Plugin entry point
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Building

```bash
npm run build
```

## Submitting Changes

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes

3. Ensure tests pass:
   ```bash
   npm test
   ```

4. Commit with a descriptive message:
   ```bash
   git commit -m "feat: add support for X"
   ```

5. Push and create a Pull Request

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

## Code Style

- Use TypeScript with strict mode
- Export types from `types.ts`
- Add JSDoc comments for public APIs
- Keep functions focused and small

## Testing

- Add tests for new features
- Maintain or improve code coverage
- Test both success and error paths

## Questions?

Feel free to open an issue for questions or discussions!
