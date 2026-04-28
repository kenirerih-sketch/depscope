---
title: "The State of Package Health: Weekly Report #003"
slug: weekly-report-003
date: 2026-04-27
author: DepScope
tags: [package-health, supply-chain, weekly-report]
description: "Fresh package health numbers from the DepScope index — 742,226 packages across 19 ecosystems."
---

# The State of Package Health — Weekly Report #003

Snapshot date: **2026-04-27**. Index: **742,226 packages**, **17,306 vulnerabilities** tracked.

## Health distribution

| Bucket | Count |
|---|---:|
| Critical (< 40)   | 469,779 |
| Poor (40–59)      | 211,300 |
| Fair (60–79)      | 52,357 |
| Good (80+)        | 4,862 |
| Unknown/unscored  | 3,928 |

## Popular packages with open vulnerabilities

**371** packages with >1M weekly downloads have at least one tracked advisory.

| Ecosystem | Package | Vulns | Weekly downloads |
|---|---|---:|---:|
| pypi | `apache-airflow` | 113 | 4,989,379 |
| pypi | `mlflow` | 68 | 8,636,351 |
| pypi | `ansible` | 68 | 2,766,827 |
| pypi | `pillow` | 62 | 111,052,946 |
| conda | `pillow` | 62 | 235,817 |
| npm | `electron` | 48 | 3,333,433 |
| pypi | `gradio` | 47 | 3,629,168 |
| npm | `next` | 42 | 36,660,402 |
| pypi | `vllm` | 42 | 1,357,742 |
| pypi | `opencv-contrib-python` | 32 | 1,622,038 |
| pypi | `paddlepaddle` | 32 | 396,892 |
| npm | `hono` | 26 | 34,332,796 |
| rubygems | `rubygems-update` | 25 | 1,212,398 |
| nuget | `Microsoft.AspNetCore.App.Runtime.win-x64` | 24 | 698,354 |
| nuget | `Microsoft.AspNetCore.App.Runtime.win-x86` | 24 | 125,966 |

## Zombie packages (deprecated, still installed)

**149 deprecated packages** with >1M weekly downloads — combined downloads: 1,473,863,794/week.

| Package | Weekly downloads | Why it's deprecated |
|---|---:|---|
| `mimic-fn` | 104,634,494 | Renamed to mimic-function |
| `pkg-dir` | 78,515,524 | Renamed to `package-directory`. |
| `path-is-absolute` | 76,522,592 | This package is no longer relevant as Node.js 0.12 is unmaintained. |
| `find-cache-dir` | 43,023,728 | Renamed to `find-cache-directory`. |
| `System.Runtime.CompilerServices.Unsafe` | 39,264,424 | This package is no longer actively maintained and shouldn't be referenced on .NET 7+. It is only required on older versi |
| `@types/uuid` | 37,084,892 | This is a stub types definition. uuid provides its own type definitions, so you do not need this installed. |
| `read-pkg-up` | 36,215,965 | Renamed to read-package-up |
| `@babel/plugin-proposal-private-property-in-object` | 35,911,668 | This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel |
| `no-case` | 35,124,932 | Use `change-case` |
| `@types/eslint-scope` | 31,248,791 | This is a stub types definition. eslint-scope provides its own type definitions, so you do not need this installed. |
| `node-domexception` | 30,320,105 | Use your platform's native DOMException instead |
| `p-finally` | 29,420,367 | Deprecated |
| `camel-case` | 28,111,822 | Use `change-case` |
| `param-case` | 27,137,880 | Use `change-case` |
| `pascal-case` | 24,810,966 | Use `change-case` |

## Worst health scores among popular packages

| Package | Health | Weekly downloads |
|---|---:|---:|
| `angular` (npm) | 11 | 511,102 |
| `SshNet.Security.Cryptography` (nuget) | 14 | 715,507 |
| `Microsoft.Extensions.PlatformAbstractions` (nuget) | 17 | 1,582,143 |
| `System.Net.WebSockets.WebSocketProtocol` (nuget) | 18 | 595,697 |
| `Microsoft.Bcl` (nuget) | 20 | 539,891 |
| `Polly.Extensions.Http` (nuget) | 20 | 2,207,320 |
| `@oclif/help` (npm) | 20 | 687,316 |
| `apollo-server-core` (npm) | 22 | 978,064 |
| `@types/moment-timezone` (npm) | 23 | 633,131 |
| `MediatR.Extensions.Microsoft.DependencyInjection` (nuget) | 23 | 803,274 |

## Ecosystem comparison (avg health)

| Ecosystem | Packages | Avg health | Deprecated |
|---|---:|---:|---:|
| nuget | 4,258 | 62.8 | 218 |
| cargo | 20,942 | 59.0 | 0 |
| maven | 692 | 51.4 | 0 |
| rubygems | 10,231 | 51.2 | 0 |
| conda | 31,938 | 50.9 | 0 |
| swift | 4,684 | 44.8 | 230 |
| cocoapods | 493 | 42.6 | 0 |
| hackage | 18,914 | 42.2 | 0 |
| pypi | 97,345 | 41.9 | 0 |
| homebrew | 8,200 | 41.3 | 207 |
| hex | 19,268 | 41.0 | 1059 |
| cran | 23,244 | 40.7 | 0 |
| npm | 312,993 | 38.0 | 4458 |
| go | 23,136 | 37.8 | 0 |
| composer | 44,950 | 37.4 | 1327 |
| pub | 73,900 | 36.8 | 3872 |
| cpan | 43,102 | 30.8 | 0 |

## Breaking changes in popular packages

- **ansi-styles** (npm) `v3.0.0 → v4.0.0` *breaking* — Require Node.js 8 aa974fb Enhancements:
- **ansi-styles** (npm) `unknown → v3.0.0` *breaking* — ansiStyles.modifier ```
- **ansi-styles** (npm) `v4.3.0 → v5.0.0` *breaking* — Remove support for `hsv`, `hwb`, `ansi`, and CSS keyword colors
- **ansi-styles** (npm) `v4.3.0 → v5.0.0` *breaking* — If you need those colors, you can use [`color-convert`](https://github.com/Qix-/color-convert), which is what we used to depend on.
- **ansi-styles** (npm) `v5.2.0 → v6.0.0` *breaking* — This package is now pure ESM. Please [read this](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c). https://github.com/chalk/ansi-styles/compare/v5.2.0...v6.0.
- **ansi-styles** (npm) `unknown → v3.0.0` *breaking* — ansiStyles.modifiers
- **ansi-styles** (npm) `3.0.0 → 4.0.0` *breaking* — Require Node.js 8  aa974fb
- **ansi-styles** (npm) `v5.2.0 → v6.0.0` *breaking* — Require Node.js 12 b23ef5d
- **ansi-styles** (npm) `v4.3.0 → v5.0.0` *breaking* — These color types added bloat and were rarely used. As a result, this package should now be lighter and faster to import.
- **ansi-styles** (npm) `unknown → 3.0.0` *breaking* — ansiStyles.modifiers

## Try it yourself

```bash
curl -s https://depscope.dev/api/check/npm/next | jq '.health_score'
curl -s https://depscope.dev/api/check/pypi/pydantic | jq '.deprecated'
```
