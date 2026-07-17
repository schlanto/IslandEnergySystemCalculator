# Contributing

## Submit through GitHub

The recommended route is the **Add a component** Issue Form. Supply the exact manufacturer/model name, all known ratings, and at least one verifiable source URL. Automation creates a draft data pull request; it never merges it. A maintainer checks the source, transcription, units, and data quality.

## Add a JSON file manually

1. Choose `data/generators`, `data/consumers`, `data/storage`, or `data/converters`.
2. Copy a nearby example into a new file. One file represents exactly one physical device.
3. Use an ID and filename of `lowercase-manufacturer-model`, containing only lowercase letters, digits, and hyphens.
4. Use `null` for known-but-unavailable technical values. Never invent a value.
5. Include one or more sources. A URL and access date are mandatory.
6. Mark manufacturer, measured, estimated, or demonstration data accurately.

Run:

```bash
npm run validate:data
npm test
npm run lint
npm run build
```

Pull requests receive automated checks and manual review. Reviewers may normalize names, split ambiguous components, request a stronger source, or reject unverifiable data. Manufacturer-specific numbers must be supported by manufacturer or independently measured documentation.
