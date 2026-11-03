# reach-map

Click anywhere in a city and see everywhere you can reach by public transport in an hour.

The owner's brief is [docs/brief.md](docs/brief.md). A forger work loop builds it: requests are GitHub issues labelled `ready-for-agent`, each is built on its own branch, and a PR merges only when the gates in `.forger/workloop.config.json`, CI and an independent verifier pass.

## Develop

```
bun install
bun run start
bun run check
```

## Docs

- [docs/brief.md](docs/brief.md): the owner's brief.
- [docs/research/](docs/research/): the research notes with sources.
- [docs/adr/](docs/adr/): the decisions.
- [docs/plan.md](docs/plan.md): the build as ordered slices.
- `spike/` holds throwaway checks of the routing assumption; the build slices replace it.
