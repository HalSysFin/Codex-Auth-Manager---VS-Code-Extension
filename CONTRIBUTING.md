# Contributing

Thanks for helping improve CAM - VS Code Extension.

## Development Principles

- keep lease handling resilient and predictable
- keep auth materialization safe and explicit
- prefer clear recovery over silent auth churn
- keep compatibility with CAM Auth Manager lease endpoints

## Local Development

```bash
npm install
npm run compile
npm test
npx @vscode/vsce package
```

## Pull Requests

Please include:

- a short summary of the change
- testing notes
- screenshots if UI or status presentation changed
- any lease lifecycle behavior changes
