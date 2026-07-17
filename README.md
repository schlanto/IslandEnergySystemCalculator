# Island Energy System Calculator

A privacy-friendly, fully static web application for assembling small off-grid energy systems, checking electrical compatibility, and simulating battery state of charge. All calculations run locally in the browser; there are no accounts, cookies, analytics, or backend services.

## Features

- Searchable, source-backed component catalogue with one JSON file per physical device
- Consumer schedules, generator profiles, 24 h/48 h/7 day simulations, and 1–60 minute resolution
- Voltage, current, continuous power, startup power, and storage-limit checks
- Interactive Apache ECharts power-flow, state-of-charge, energy-balance, and contribution charts
- JSON configuration import/export and optional local restoration
- JSON Schema validation, issue-driven component contributions, and GitHub Pages deployment

> Screenshot placeholder: add `docs/screenshot.png` after the first public deployment.

## Local development

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run validate:data
npm test
npm run lint
npm run build
```

## Deployment

The Pages workflow builds on pushes to `main`. Vite derives the repository base path in GitHub Actions and uses `/` locally. Enable **GitHub Actions** as the Pages source in repository settings.

## Contributing data

Use the **Add a new component** issue form or follow [CONTRIBUTING.md](CONTRIBUTING.md). Every component must cite at least one publicly verifiable source. Manufacturer specifications, official manuals, certification documents, scientific publications, and reproducible measurements are accepted; estimates must be marked as estimates. Demonstration entries in this repository use public generic engineering references and are clearly labelled.

See [calculation methodology](docs/calculations.md) and the [data model](docs/data-model.md) for technical details.

## License

MIT
