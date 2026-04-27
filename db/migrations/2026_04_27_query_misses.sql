-- Lazy-on-miss tracking: queries to /api/check, /api/maintainers, /api/quality
-- that miss our index get logged here. Worker scripts/process_query_misses.py
-- dequeues pending rows and runs the appropriate compute_*/ingest_* path.
CREATE TABLE IF NOT EXISTS query_misses (
    id SERIAL PRIMARY KEY,
    ecosystem TEXT NOT NULL,
    package_name TEXT NOT NULL,
    miss_type TEXT NOT NULL,
    miss_count INT NOT NULL DEFAULT 1,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT pending,
    computed_at TIMESTAMPTZ,
    error TEXT,
    UNIQUE (ecosystem, package_name, miss_type)
);
CREATE INDEX IF NOT EXISTS idx_query_misses_pending
  ON query_misses (miss_count DESC, last_seen DESC)
  WHERE status = pending;
