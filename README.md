# Community Energy Calculator

A small, fully static website for answering three basic questions about a simple battery energy system:

1. Can the enabled inverter and power source supply the consumers' peak power?
2. How long can the enabled consumers run from a full battery when there is no generation?
3. How does the average power balance change when components are switched on or off?

The calculator is deliberately simple and intended for people without an electrical engineering background. All calculations run locally in the browser. There is no backend, account, tracking, analytics, or cookie requirement.

## Important limitation

This is only a rough planning aid. It compares a small number of listed power, energy, current, and voltage values. It does not prove electrical compatibility, safety, compliance, or reliable operation. Data and software may be incomplete, outdated, or wrong. Verify every value with the original manufacturer documentation and involve a qualified professional before buying, connecting, or operating equipment.

## How it works

- Add consumers, generators, batteries, and converters from individual JSON files.
- Switch every selected component on or off.
- Set quantity and one simple percentage:
  - consumer: average power as a percentage of continuous power;
  - generator: average output as a percentage of rated power;
  - battery: share of listed usable capacity available;
  - converter: available share of its listed rating.
- Read the peak-power answer, battery runtime, average power balance, and basic checks.

The peak calculation conservatively assumes that all enabled consumers may reach their listed startup or peak power at the same time.

A battery is optional for the peak-power answer. Without a battery, enabled generator rated power is compared with the estimated peak input demand. Battery runtime cannot be calculated when no battery is enabled.

## Development

You can run the project either with Docker or with a local Node.js installation.

For complete Windows PowerShell and Docker instructions, including troubleshooting, read [Local development](docs/local-development.md).

Quick start with Node.js 22 or later:

```bash
npm install
npm run dev
```

Then open `http://localhost:5173/`.

Quality checks:

```bash
npm run validate:data
npm test
npm run lint
npm run build
```

## Component data

Every physical component has its own JSON file under `data/`. Every entry must include at least one public source. Unknown values remain `null` or are omitted; they must never be guessed.

Use the GitHub **Add a component** issue form or follow [CONTRIBUTING.md](CONTRIBUTING.md).

Technical details are documented in [docs/calculations.md](docs/calculations.md) and [docs/data-model.md](docs/data-model.md).

For a file-by-file description of the complete application, runtime data flow, exact formulas, contribution automation, tests, and deployment, read [Project architecture](docs/architecture.md).

## GitHub Pages

The deployment workflow validates data, runs tests and lint, builds the static site, and deploys `dist/` through GitHub Pages. Select **GitHub Actions** as the Pages source in repository settings.

## License

MIT
