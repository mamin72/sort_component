# sort_component

Reusable TypeScript sorting component library.

## Data Format Contract

`sort_component` sorts in-memory arrays using sort rules.

- Supported direct input: array of typed items (for example `Person[]`).
- Not accepted directly: raw text strings, text streams, JSON text, XML text.

If your source is text, stream, JSON, or XML, parse it first into a typed array,
then call `sortByRules`.

### Typical Source-to-Array Mapping

- Text string: split/parse lines into typed objects.
- Text stream: read stream chunks, parse records, build typed objects.
- JSON: parse to objects and validate required fields.
- XML: parse to objects and map to your typed domain model.

For end-to-end examples, see the wiki pages: `Use in Your App` and `API Reference`.

## Licensing

This project uses a dual-license model:

- Non-commercial usage is allowed under the default repository license.
- Commercial usage requires a separate paid commercial license.

See [LICENSE](LICENSE) and [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) for details.

For commercial licensing requests, contact the repository owner:
- https://github.com/mamin72

## Setup

```bash
npm install
```

## Scripts

```bash
npm run build
npm run test
npm run test:coverage
npm run lint
npm run typecheck
npm run quality:check
```

## Wiki

The project includes versioned wiki content in the `wiki/` folder:

- `Home.md`
- `Quick-Start.md`
- `Use-in-Your-App.md`
- `API-Reference.md`
- `Licensing.md`
- `FAQ.md`

Publish to GitHub wiki:

1. Create one initial wiki page in GitHub UI (this initializes the wiki git backend):
	- https://github.com/mamin72/sort_component/wiki
2. Run the publish script:

```powershell
pwsh ./scripts/publish-wiki.ps1
```
