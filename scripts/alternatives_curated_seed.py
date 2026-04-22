#!/usr/bin/env python3
"""Seed curated (eco, deprecated_pkg, alt_pkg, reason, score) alternatives.

Only inserts when both packages exist in DB — no-ops for missing pairs. Uses
ON CONFLICT DO NOTHING so re-runs are idempotent."""
import asyncio
import sys
sys.path.insert(0, "/home/deploy/depscope")

from api.database import get_pool

# (eco, deprecated_pkg, alt_pkg, reason, score 0-100 = confidence)
CURATED = [
    # npm — deprecated / superseded
    ("npm", "moment", "dayjs",             "moment is in maintenance mode — dayjs has same API, 2KB", 95),
    ("npm", "moment", "date-fns",          "moment is in maintenance mode — date-fns is tree-shakeable", 90),
    ("npm", "moment", "luxon",             "moment successor from the Moment team", 85),
    ("npm", "request", "axios",            "request is deprecated — axios is the de-facto replacement", 95),
    ("npm", "request", "got",              "request is deprecated — got is modern with better types", 85),
    ("npm", "request", "node-fetch",       "request is deprecated — use native fetch / node-fetch", 80),
    ("npm", "request", "undici",           "request is deprecated — undici is Node official HTTP client", 85),
    ("npm", "node-fetch", "undici",        "native fetch via undici is in Node 18+", 80),
    ("npm", "underscore", "lodash",        "lodash is the community-maintained successor", 80),
    ("npm", "bower", "npm",                "bower is deprecated — npm is the standard", 95),
    ("npm", "bower", "yarn",               "bower is deprecated — yarn is a faster alternative", 80),
    ("npm", "bower", "pnpm",               "bower is deprecated — pnpm is disk-efficient", 80),
    ("npm", "gulp", "vite",                "gulp is legacy — vite is the modern build tool", 85),
    ("npm", "gulp", "esbuild",             "gulp is legacy — esbuild is 100x faster", 80),
    ("npm", "gulp", "webpack",             "gulp is legacy — webpack for complex configs", 75),
    ("npm", "grunt", "vite",               "grunt is legacy — vite is the modern alternative", 80),
    ("npm", "coffee-script", "typescript", "coffee-script is dead — typescript is the modern alternative", 90),
    ("npm", "protractor", "playwright",    "protractor was discontinued — playwright is the successor", 95),
    ("npm", "protractor", "cypress",       "protractor was discontinued — cypress for E2E", 85),
    ("npm", "phantomjs", "puppeteer",      "phantomjs is abandoned — puppeteer uses real Chrome", 95),
    ("npm", "phantomjs", "playwright",     "phantomjs is abandoned — playwright is cross-browser", 90),
    ("npm", "phantomjs-prebuilt", "puppeteer", "phantomjs-prebuilt is abandoned", 95),
    ("npm", "node-sass", "sass",           "node-sass is deprecated — dart-sass (sass package) is the replacement", 95),
    ("npm", "tslint", "eslint",            "tslint is deprecated — eslint with @typescript-eslint supersedes it", 95),
    ("npm", "karma", "vitest",             "karma is deprecated — vitest is a modern test runner", 85),
    ("npm", "karma", "jest",               "karma is deprecated — jest for unit tests", 80),
    ("npm", "enzyme", "@testing-library/react", "enzyme unmaintained — testing-library is the React-recommended", 90),
    ("npm", "create-react-app", "vite",    "CRA is deprecated — vite for fresh React projects", 90),
    ("npm", "create-react-app", "next",    "CRA is deprecated — Next.js for full-stack React", 85),
    ("npm", "mocha", "vitest",             "mocha is still ok but vitest is faster + ESM native", 65),
    ("npm", "left-pad", "String.prototype.padStart", "left-pad is pointless — use native padStart", 95),
    ("npm", "babel-preset-es2015", "@babel/preset-env", "babel 6 presets removed — use @babel/preset-env", 95),
    ("npm", "tslib", "typescript",         "tslib is a runtime helper — included with typescript", 70),
    ("npm", "bluebird", "native promises", "bluebird was needed before ES2015 — use native Promise", 80),
    ("npm", "q", "native promises",        "q was needed before ES2015 — use native Promise", 80),
    ("npm", "istanbul", "nyc",             "istanbul CLI is deprecated — use nyc (istanbul v2)", 80),

    # PyPI — modern alternatives
    ("pypi", "nose", "pytest",             "nose is abandoned — pytest is the standard", 95),
    ("pypi", "nose2", "pytest",            "nose2 is rarely used — pytest is the standard", 85),
    ("pypi", "pipenv", "poetry",           "pipenv is slow and buggy — poetry is the modern choice", 80),
    ("pypi", "pipenv", "uv",               "pipenv is slow — uv (Astral) is 100x faster", 85),
    ("pypi", "pylint", "ruff",             "pylint is slow — ruff (Rust-based) is 100x faster", 80),
    ("pypi", "flake8", "ruff",             "flake8 rules are all in ruff — ruff is 100x faster", 80),
    ("pypi", "black", "ruff",              "ruff format is a drop-in replacement for black", 70),
    ("pypi", "isort", "ruff",              "ruff includes isort-compatible import sorting", 80),
    ("pypi", "requests", "httpx",          "requests is still good, httpx adds HTTP/2 + async", 60),
    ("pypi", "urllib3", "httpx",           "prefer httpx for new code", 55),
    ("pypi", "setuptools", "hatchling",    "modern PEP 517 build backend", 50),

    # Cargo — modern replacements
    ("cargo", "failure", "anyhow",         "failure is deprecated — anyhow for apps", 95),
    ("cargo", "failure", "thiserror",      "failure is deprecated — thiserror for libs", 95),
    ("cargo", "error-chain", "thiserror",  "error-chain is legacy — thiserror is the modern approach", 90),
    ("cargo", "async-std", "tokio",        "async-std is mostly unmaintained — tokio is the standard", 85),
    ("cargo", "tokio-core", "tokio",       "tokio-core is 0.1 era — current tokio supersedes it", 95),
    ("cargo", "futures-cpupool", "rayon",  "futures-cpupool is abandoned — rayon for CPU parallelism", 90),
    ("cargo", "hyper-tls", "rustls",       "rustls is pure-Rust and faster than hyper-tls", 70),

    # Rubygems
    ("rubygems", "rspec", "minitest",      "both widely used; minitest is stdlib", 40),
    ("rubygems", "devise", "rodauth",      "rodauth is lighter and more secure", 55),

    # Composer / PHP
    ("composer", "guzzlehttp/guzzle", "symfony/http-client", "symfony/http-client is PSR-18 compliant, lighter", 55),

    # --- Round 2 additions ---
    # Python — more deprecations / modernizations
    ("pypi", "simplejson", "json",         "simplejson predates stdlib json (2.6+) — prefer stdlib", 90),
    ("pypi", "ipdb", "pdb",                "pdb is stdlib — ipdb adds IPython integration only", 50),
    ("pypi", "tox", "nox",                 "nox uses pure Python config vs tox ini — easier for complex matrices", 40),
    ("pypi", "virtualenv", "venv",         "venv is stdlib since Python 3.3 — virtualenv only needed for ancient Python", 80),
    ("pypi", "marshmallow", "pydantic",    "pydantic v2 has better types, JSON schema, and is faster", 65),
    ("pypi", "setuptools", "hatchling",    "hatchling is PEP 517 native, simpler pyproject.toml", 55),
    ("pypi", "setuptools", "flit",         "flit is minimal for pure-Python libraries", 50),
    ("pypi", "setuptools", "pdm",          "pdm is modern with lockfile + PEP 582 support", 55),
    ("pypi", "mock", "unittest.mock",      "mock is stdlib in unittest.mock since Python 3.3", 95),
    ("pypi", "enum34", "enum",             "enum is stdlib since Python 3.4 — enum34 is backport", 95),
    ("pypi", "pathlib2", "pathlib",        "pathlib is stdlib since Python 3.4", 95),
    ("pypi", "subprocess32", "subprocess", "subprocess32 was a Python 2 backport; stdlib subprocess in Py3 is better", 95),
    ("pypi", "imp", "importlib",           "imp was removed in Python 3.12 — use importlib", 95),
    ("pypi", "distutils", "setuptools",    "distutils was removed in Python 3.12 — use setuptools or hatchling", 95),

    # Rust — Rust 2024 / modern idioms
    ("cargo", "lazy_static", "once_cell",  "once_cell::sync::Lazy is the modern equivalent (zero macros)", 80),
    ("cargo", "structopt", "clap",         "structopt was merged into clap v3+ as derive feature", 90),
    ("cargo", "futures-preview", "futures", "futures-preview was renamed to futures in 2019", 95),
    ("cargo", "chrono", "jiff",            "jiff (by BurntSushi) is modern with timezone-aware types", 45),
    ("cargo", "chrono", "time",            "time 0.3+ has a cleaner API than chrono", 40),
    ("cargo", "serde_derive", "serde",     "serde with derive feature is the canonical use", 60),
    ("cargo", "actix", "actix-web",        "for web apps use actix-web; actix is lower-level actor runtime", 55),

    # npm — additional
    ("npm", "yarn", "pnpm",                "pnpm uses content-addressable storage — 10x less disk", 50),
    ("npm", "lerna", "nx",                 "lerna is maintenance-only — nx/turborepo for monorepos", 70),
    ("npm", "lerna", "turborepo",          "lerna is maintenance-only — turborepo for fast monorepos", 70),
    ("npm", "typeorm", "drizzle-orm",      "drizzle-orm is type-safe first, zero runtime overhead", 50),
    ("npm", "typeorm", "prisma",           "prisma has better DX, migrations", 55),
    ("npm", "sequelize", "drizzle-orm",    "drizzle-orm is type-safe and lighter", 45),
    ("npm", "sequelize", "prisma",         "prisma supersedes sequelize for type-safe ORMs", 50),
    ("npm", "web3", "viem",                "viem is type-safe replacement for web3 and ethers", 80),
    ("npm", "web3", "ethers",              "ethers is the mature Ethereum library", 75),
    ("npm", "prettier-eslint", "prettier", "prettier alone + eslint separate is the current best practice", 60),

    # Rubygems
    ("rubygems", "spring", "bootsnap",     "spring is deprecated in Rails 7+ — bootsnap supersedes", 75),
    ("rubygems", "sass-rails", "sass-rails-compiler", "sass-rails is deprecated — use sassc-rails or dartsass-rails", 70),

    # --- Round 3 additions ---
    # Python scientific / data / web
    ("pypi", "pandas", "polars",           "polars is 10x faster with lazy eval and multi-threaded engine", 55),
    ("pypi", "matplotlib", "plotly",       "plotly offers interactive charts out of the box", 45),
    ("pypi", "matplotlib", "altair",       "altair has a declarative grammar-of-graphics API", 40),
    ("pypi", "tqdm", "rich",               "rich.progress integrates with the rich TUI ecosystem", 45),
    ("pypi", "flask", "fastapi",           "fastapi is async and has automatic OpenAPI docs", 60),
    ("pypi", "flask", "starlette",         "starlette is the ASGI base flask-async tries to match", 50),
    ("pypi", "flask", "litestar",          "litestar (ex-starlite) is async with DI and plugins", 50),
    ("pypi", "fastapi", "litestar",        "litestar has built-in DI, better performance benchmarks", 45),
    ("pypi", "celery", "dramatiq",         "dramatiq is simpler and has better defaults than celery", 45),
    ("pypi", "celery", "rq",               "rq is lighter-weight for Redis-only job queues", 45),

    # Python deprecations / Python 3.12+ removals
    ("pypi", "six", "python 3",            "six is the Python 2/3 compat shim - no longer needed on Py3-only", 90),
    ("pypi", "future", "python 3",         "future is a Python 2/3 compat layer - obsolete on Py3", 90),
    ("pypi", "futures", "concurrent.futures", "futures is the Py2 backport - stdlib concurrent.futures on Py3", 95),
    ("pypi", "configparser", "configparser", "configparser is stdlib on Py3 - the PyPI backport is only for Py2", 85),
    ("pypi", "argparse", "argparse",       "argparse is stdlib since Python 2.7/3.2 - the PyPI package is obsolete", 90),
    ("pypi", "pytz", "zoneinfo",           "zoneinfo is stdlib since Python 3.9 - pytz is legacy", 75),
    ("pypi", "chardet", "charset-normalizer", "charset-normalizer is the requests-endorsed modern detector", 70),
    ("pypi", "ujson", "orjson",            "orjson is faster and handles more types correctly (dataclass, UUID)", 60),
    ("pypi", "docopt", "click",            "docopt is unmaintained - click is actively developed", 75),
    ("pypi", "docopt", "typer",            "docopt is unmaintained - typer uses type hints", 70),

    # Python config / validation modernization
    ("pypi", "python-decouple", "pydantic-settings", "pydantic-settings offers typed config with validation", 50),
    ("pypi", "attrs", "dataclasses",       "dataclasses is stdlib since Python 3.7 - attrs only for extra features", 55),

    # Rust web / async modernization
    ("cargo", "actix-web", "axum",         "axum is tokio-native and more idiomatic for 2024+ Rust", 55),
    ("cargo", "warp", "axum",              "warp is maintenance-only - axum is the tokio ecosystem successor", 75),
    ("cargo", "rocket", "axum",            "rocket async story lagged - axum is production-ready async", 55),
    ("cargo", "diesel", "sqlx",            "sqlx is async with compile-time checked queries", 50),
    ("cargo", "diesel", "sea-orm",         "sea-orm is async and built on sqlx", 45),
    ("cargo", "serde_yaml", "serde_yaml_ng", "serde_yaml is officially archived - serde_yaml_ng is the community fork", 90),
    ("cargo", "reqwest", "ureq",           "ureq is a simpler sync-only HTTP client with no tokio dependency", 45),
    ("cargo", "isahc", "reqwest",          "isahc is less active - reqwest is the de-facto HTTP client", 55),

    # Rust errors / logging / misc
    ("cargo", "pretty_env_logger", "tracing", "tracing + tracing-subscriber is the modern structured logging stack", 60),
    ("cargo", "env_logger", "tracing",     "tracing supports async spans and structured fields", 55),
    ("cargo", "log", "tracing",            "tracing is log-compatible but adds spans for async contexts", 50),
    ("cargo", "slog", "tracing",           "slog is maintenance - tracing is the ecosystem standard", 60),
    ("cargo", "rand", "fastrand",          "fastrand is tiny and fine for non-crypto use", 45),

    # Go web / db / logging (packages use full module paths)
    ("go", "github.com/gorilla/mux", "github.com/go-chi/chi/v5", "gorilla/mux was archived in Dec 2022 - chi is the idiomatic successor", 85),
    ("go", "github.com/gorilla/mux", "github.com/gin-gonic/gin", "gorilla/mux was archived - gin is a popular alternative", 75),
    ("go", "github.com/gorilla/mux", "github.com/labstack/echo/v4", "gorilla/mux was archived - echo is another popular option", 70),
    ("go", "github.com/jinzhu/gorm", "gorm.io/gorm", "jinzhu/gorm is v1 (deprecated) - gorm.io/gorm is v2", 95),
    ("go", "github.com/go-pg/pg", "github.com/jackc/pgx/v5", "go-pg is archived - pgx is the modern Postgres driver", 85),
    ("go", "github.com/jackc/pgx", "github.com/jackc/pgx/v5", "pgx v4 is superseded - v5 is the current major", 85),
    ("go", "github.com/sirupsen/logrus", "go.uber.org/zap", "logrus is in maintenance mode - zap is much faster", 70),
    ("go", "github.com/sirupsen/logrus", "log/slog", "slog is stdlib since Go 1.21 - supersedes external loggers", 75),
    ("go", "github.com/golang/glog", "log/slog", "glog is legacy - stdlib slog in Go 1.21+ is the standard", 85),
    ("go", "github.com/dgrijalva/jwt-go", "github.com/golang-jwt/jwt/v5", "dgrijalva/jwt-go is abandoned - golang-jwt is the community fork", 95),
    ("go", "github.com/golang-jwt/jwt", "github.com/golang-jwt/jwt/v5", "jwt v4 is superseded - v5 is the current major", 80),
    ("go", "github.com/satori/go.uuid", "github.com/google/uuid", "satori/go.uuid is unmaintained - google/uuid is the standard", 90),
    ("go", "github.com/pkg/errors", "errors", "pkg/errors was archived - stdlib errors since Go 1.13 wraps with %w", 85),
    ("go", "github.com/gorilla/websocket", "github.com/coder/websocket", "gorilla/websocket archived - coder/websocket (ex-nhooyr) is the successor", 80),

    # JS frameworks / tooling / testing
    ("npm", "react-query", "@tanstack/react-query", "react-query v3 was renamed to @tanstack/react-query from v4+", 95),
    ("npm", "formik", "react-hook-form",   "react-hook-form has better performance and smaller bundle", 70),
    ("npm", "yup", "zod",                  "zod is TypeScript-first with inferred types", 70),
    ("npm", "styled-components", "@emotion/styled", "styled-components v6 maintenance - emotion is actively developed", 50),
    ("npm", "styled-components", "tailwindcss", "tailwindcss avoids runtime CSS-in-JS overhead", 55),
    ("npm", "emotion", "@emotion/react",   "emotion v10 namespace moved to @emotion/react in v11", 90),
    ("npm", "redux", "zustand",            "zustand has far less boilerplate for most use cases", 50),
    ("npm", "redux", "jotai",              "jotai atom model is simpler for React state", 45),
    ("npm", "chai", "vitest",              "vitest expect is chai-compatible and built-in", 55),
    ("npm", "mocha", "node:test",          "node:test is stdlib since Node 18 - zero-dep testing", 50),
    ("npm", "gatsby", "astro",             "gatsby dev experience is painful - astro ships less JS", 65),
    ("npm", "gatsby", "next",              "gatsby is in maintenance - next covers SSG with much larger ecosystem", 70),
    ("npm", "webpack", "rspack",           "rspack is a Rust-based webpack-compatible bundler - 10x faster", 55),
    ("npm", "webpack", "vite",             "vite is faster in dev via esbuild + native ESM", 60),
    ("npm", "parcel", "vite",              "parcel v2 development slowed - vite is the modern zero-config bundler", 55),
    ("npm", "body-parser", "express",      "express 4.16+ includes body-parser functionality natively", 75),
    ("npm", "crypto-js", "node:crypto",    "node:crypto (stdlib) and Web Crypto API supersede crypto-js", 70),
    ("npm", "bcryptjs", "bcrypt",          "bcrypt (native) is significantly faster than pure-JS bcryptjs", 55),
    ("npm", "jsonwebtoken", "jose",        "jose supports JWT + JWE + JWS with modern crypto and Web Crypto API", 55),
    ("npm", "redux-saga", "redux-thunk",   "redux-toolkit + thunk is the official Redux recommendation", 55),
    ("npm", "redux-thunk", "zustand",      "for new code zustand avoids the redux ceremony entirely", 45),

    # Ruby / Rails
    ("rubygems", "paperclip", "activestorage", "paperclip is deprecated - activestorage is built into Rails 5.2+", 90),
    ("rubygems", "unicorn", "puma",        "puma is the Rails default since 5.0 and supports threads", 70),
    ("rubygems", "unicorn", "falcon",      "falcon is async-native and handles high concurrency per process", 50),
    ("rubygems", "puma", "falcon",         "falcon uses fibers for async IO without thread overhead", 45),
    ("rubygems", "sass-rails", "sassc-rails", "sass-rails depends on ruby-sass (dead) - sassc-rails uses libsass", 80),
    ("rubygems", "resque", "sidekiq",      "sidekiq is multi-threaded and much more memory-efficient", 70),
    ("rubygems", "carrierwave", "activestorage", "activestorage is Rails stdlib since 5.2 for file uploads", 55),

    # Composer / PHP
    ("composer", "league/climate", "symfony/console", "symfony/console is the PHP de-facto CLI toolkit", 65),
    ("composer", "symfony/polyfill-mbstring", "ext-mbstring", "PHP 8+ ships mbstring - polyfill only needed for older PHP", 70),
    ("composer", "symfony/polyfill-ctype", "ext-ctype", "PHP 8+ has ctype built-in - polyfill is obsolete there", 70),
    ("composer", "symfony/polyfill-php80", "php >= 8.0", "polyfill-php80 is unnecessary on PHP 8.0+", 85),
    ("composer", "symfony/polyfill-php81", "php >= 8.1", "polyfill-php81 is unnecessary on PHP 8.1+", 85),
    ("composer", "symfony/polyfill-php82", "php >= 8.2", "polyfill-php82 is unnecessary on PHP 8.2+", 85),

    # Java / Maven — post-log4shell, JUnit 5
    ("maven", "org.apache.logging.log4j:log4j-core", "ch.qos.logback:logback-classic", "post-log4shell many projects moved to slf4j + logback default", 55),
    ("maven", "org.apache.logging.log4j:log4j-core", "org.slf4j:slf4j-api", "prefer programming against slf4j-api and binding any logger backend", 60),
    ("maven", "junit:junit", "org.junit.jupiter:junit-jupiter", "junit 4 is in maintenance - junit 5 (jupiter) is the current major", 90),
]


async def main():
    pool = await get_pool()
    inserted = 0
    skipped = 0
    async with pool.acquire() as conn:
        for eco, pkg, alt, reason, score in CURATED:
            pid = await conn.fetchval(
                "SELECT id FROM packages WHERE ecosystem=$1 AND name=$2",
                eco, pkg,
            )
            if not pid:
                skipped += 1
                continue
            aid = await conn.fetchval(
                "SELECT id FROM packages WHERE ecosystem=$1 AND name=$2",
                eco, alt,
            )
            # alternative_package_id optional; alternative_name required for display
            r = await conn.execute(
                """INSERT INTO alternatives (package_id, alternative_package_id, alternative_name, reason, score)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (package_id, alternative_name) DO UPDATE
                     SET reason = EXCLUDED.reason,
                         score = GREATEST(alternatives.score, EXCLUDED.score),
                         alternative_package_id = COALESCE(EXCLUDED.alternative_package_id, alternatives.alternative_package_id)""",
                pid, aid, alt, reason, score,
            )
            if r and r.split()[-1] == "1":
                inserted += 1
    print(f"inserted_or_updated={inserted}  skipped={skipped}  (skipped = source pkg not in DB)")


asyncio.run(main())
