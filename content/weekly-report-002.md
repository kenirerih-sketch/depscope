---
title: "The State of Package Health: Weekly Report #002"
slug: weekly-report-002
date: 2026-04-20
author: DepScope
tags: [package-health, supply-chain, weekly-report]
description: "Fresh package health numbers from the DepScope index — 22,588 packages across 17 ecosystems."
---

# The State of Package Health — Weekly Report #002

Snapshot date: **2026-04-20**. Index: **22,588 packages**, **632 vulnerabilities** tracked.

## Health distribution

| Bucket | Count |
|---|---:|
| Critical (< 40)   | 3,564 |
| Poor (40–59)      | 9,388 |
| Fair (60–79)      | 7,229 |
| Good (80+)        | 2,389 |
| Unknown/unscored  | 18 |

## Popular packages with open vulnerabilities

**82** packages with >1M weekly downloads have at least one tracked advisory.

| Ecosystem | Package | Vulns | Weekly downloads |
|---|---|---:|---:|
| npm | `next` | 42 | 34,757,357 |
| npm | `angular` | 9 | 524,838 |
| conda | `numpy` | 8 | 425,437 |
| pypi | `lmdb` | 5 | 893,100 |
| pypi | `paddlepaddle` | 5 | 370,918 |
| pypi | `vllm` | 4 | 3,139,157 |
| pypi | `composio-core` | 4 | 102,346 |
| pypi | `Pillow` | 3 | 108,511,966 |
| pypi | `pillow` | 3 | 108,511,966 |
| conda | `pillow` | 3 | 235,364 |
| cargo | `rust-crypto` | 3 | 216,521 |
| pypi | `pip` | 2 | 128,105,971 |
| npm | `react` | 2 | 125,187,902 |
| npm | `eslint-plugin-prettier` | 2 | 27,258,312 |
| pypi | `ujson` | 2 | 21,698,954 |

## Zombie packages (deprecated, still installed)

**82 deprecated packages** with >1M weekly downloads — combined downloads: 941,010,272/week.

| Package | Weekly downloads | Why it's deprecated |
|---|---:|---|
| `mimic-fn` | 104,431,747 | Renamed to mimic-function |
| `pkg-dir` | 78,705,523 | Renamed to `package-directory`. |
| `path-is-absolute` | 76,082,652 | This package is no longer relevant as Node.js 0.12 is unmaintained. |
| `find-cache-dir` | 42,672,386 | Renamed to `find-cache-directory`. |
| `@types/uuid` | 37,184,147 | This is a stub types definition. uuid provides its own type definitions, so you do not need this installed. |
| `read-pkg-up` | 36,291,504 | Renamed to read-package-up |
| `node-domexception` | 35,298,273 | Use your platform's native DOMException instead |
| `no-case` | 34,918,820 | Use `change-case` |
| `p-finally` | 29,798,243 | Deprecated |
| `camel-case` | 28,182,607 | Use `change-case` |
| `param-case` | 27,221,685 | Use `change-case` |
| `pascal-case` | 24,504,886 | Use `change-case` |
| `os-tmpdir` | 24,464,495 | This is not needed anymore. `require('os').tmpdir()` in Node.js 4 and up is good. |
| `snake-case` | 20,292,295 | Use `change-case` |
| `lodash.isequal` | 19,136,778 | This package is deprecated. Use require('node:util').isDeepStrictEqual instead. |

## Worst health scores among popular packages

| Package | Health | Weekly downloads |
|---|---:|---:|
| `angular` (npm) | 8 | 524,838 |
| `level-concat-iterator` (npm) | 16 | 571,283 |
| `user-home` (npm) | 17 | 2,683,639 |
| `trim-right` (npm) | 17 | 3,089,154 |
| `crypto` (npm) | 17 | 1,537,680 |
| `bin-version-check` (npm) | 20 | 4,092,095 |
| `path-is-absolute` (npm) | 20 | 76,082,652 |
| `scmp` (npm) | 20 | 3,755,528 |
| `yaeti` (npm) | 20 | 1,263,002 |
| `p-finally` (npm) | 20 | 29,798,243 |

## Ecosystem comparison (avg health)

| Ecosystem | Packages | Avg health | Deprecated |
|---|---:|---:|---:|
| conda | 127 | 69.3 | 0 |
| pub | 169 | 68.0 | 2 |
| composer | 912 | 64.2 | 25 |
| npm | 11,831 | 60.5 | 203 |
| pypi | 3,482 | 57.8 | 5 |
| nuget | 715 | 56.1 | 23 |
| rubygems | 1,263 | 54.7 | 0 |
| cargo | 1,272 | 49.6 | 41 |
| hex | 302 | 48.5 | 69 |
| go | 422 | 46.5 | 1 |
| maven | 502 | 42.3 | 0 |
| cran | 309 | 42.0 | 0 |
| cpan | 477 | 41.0 | 0 |
| cocoapods | 139 | 40.7 | 0 |
| hackage | 300 | 39.7 | 0 |
| swift | 58 | 33.7 | 2 |
| homebrew | 290 | 31.1 | 2 |

## Breaking changes in popular packages

- **ansi-styles** (npm) `3.0.0 → 4.0.0` *breaking* — Add bright black color (#49)  fb5b656
- **ansi-styles** (npm) `3.0.0 → 4.0.0` *breaking* — Require Node.js 8  aa974fb
- **ansi-styles** (npm) `unknown → 3.0.0` *breaking* — ansiStyles.colors
- **ansi-styles** (npm) `unknown → 3.0.0` *breaking* — ansiStyles.modifiers
- **ansi-styles** (npm) `unknown → 3.0.0` *breaking* — ansiStyles.bgColors
- **debug** (npm) `4.0.0 → 3.2.3` *removed* — > **3.2.3 is DEPRECATED.** See https://github.com/visionmedia/debug/issues/603#issuecomment-420237335 for details.

This release mitigated the breaking changes introduced in `3.2
- **ms** (npm) `0.7.3 → 1.0.0` *breaking* — More suitable name for file containing tests: ee91f307a8dc3581ebdad614ec0533ddb3d8bf56
- **ms** (npm) `0.7.3 → 1.0.0` *breaking* — Test on LTS version of Node: c9b1fd319f0f9198d85ecf4ba83e46cc1216be04
- **ms** (npm) `0.7.3 → 1.0.0` *removed* — Removed browser testing: e818c3581aca3119c00d81901bfe8fe653bcfda4
- **ms** (npm) `0.7.3 → 1.0.0` *breaking* — Use `prettier` and `eslint`: 57b3ef8e3423cae6254f94c5564a11b4492cff43

## Try it yourself

```bash
curl -s https://depscope.dev/api/check/npm/next | jq '.health_score'
curl -s https://depscope.dev/api/check/pypi/pydantic | jq '.deprecated'
```
