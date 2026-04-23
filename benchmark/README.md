# Running the DepScope Hallucination Benchmark

Public, reproducible, CC0.

## Quick start

```bash
git clone https://github.com/cuttalo/depscope
pip install aiohttp
export ANTHROPIC_API_KEY=sk-ant-...

python3 scripts/benchmark_runner.py \
    --model claude-sonnet-4-5-20250929 \
    --corpus https://depscope.dev/api/benchmark/hallucinations \
    --out results.json
```

## Why fresh instances matter

The corpus (v1: 42 entries, growing) is **in-context contaminated** the
moment a model sees it once — any follow-up "do you recognize X?" in the
same conversation becomes biased.

This harness creates a **new API call per entry per condition** with:
- No shared message history
- Fresh system prompt each time
- No previous mention of the corpus within the session

## Two metrics, two stories

We publish **both** because the corpus hit-count distribution is skewed:

| Metric | Formula | What it measures |
|---|---|---|
| `unweighted_rate` | `hallucinated / N_entries` | How often the model falls for *any* hallucinated name |
| `weighted_rate` | `sum(hit × hallu) / sum(hit)` | Real-world **user impact**: weight each entry by how often agents in the wild hallucinate it |

For our v1 corpus, 6 entries account for ~50% of total `hit_count`.
A model that's safe on those 6 but falls for the long tail will have
a LOW weighted rate but HIGH unweighted rate — and vice versa.
Report both; never cherry-pick.

## Interpreting results

```json
{
  "baseline": {
    "N": 42, "hallucinated": 18,
    "unweighted_rate": 0.4286,
    "total_hits": 132, "weighted_hallucinated": 72,
    "weighted_rate": 0.5455
  },
  "with_depscope": {
    "N": 42, "hallucinated": 2,
    "unweighted_rate": 0.0476,
    "total_hits": 132, "weighted_hallucinated": 4,
    "weighted_rate": 0.0303
  },
  "delta": {
    "per_1k_unweighted": 381,
    "per_1k_weighted": 515
  }
}
```

Reading: "on 1000 random-from-corpus asks, DepScope prevents 381 installs
of hallucinated packages; on 1000 asks weighted by real-world frequency,
DepScope prevents 515."

## Caveats

- **Corpus bias**: we built it. Entries are curated + harvested; future
  versions should add adversarially-generated hallucinations.
- **Prompt engineering**: v1 uses a single intentionally-tempting prompt.
  Robust scoring requires a prompt variation suite.
- **Verdict parser**: current parser matches `INSTALL: eco/pkg` literally.
  Fuzzy parsing would change counts slightly.
- **Model drift**: re-run the benchmark when a new model ships.

## Reproducing our published runs

```bash
# Full corpus, Claude Sonnet 4.5
python3 scripts/benchmark_runner.py --out runs/sonnet-4-5.json

# Just top-10 by hits
python3 scripts/benchmark_runner.py --limit 10 --out runs/sonnet-4-5-top10.json

# Custom corpus filter (e.g. only pypi)
python3 scripts/benchmark_runner.py \
    --corpus "https://depscope.dev/api/benchmark/hallucinations?ecosystem=pypi" \
    --out runs/pypi-only.json
```

## Contributing

- New hallucinations? POST to our auto-harvest via `/api/benchmark/verify`
  (verdict=hallucinated feeds the corpus within 30d).
- New agent? Adapt the prompt builders in `benchmark_runner.py`.
- New metric? PR it — we'll publish multi-metric results.

## License

Dataset: **CC0** (public domain, no attribution required).
Harness code: **MIT**.
