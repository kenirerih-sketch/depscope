-- Bug #17 cleanup: 10 rows in typosquat_candidates had legitimate names with embedded
-- / (e.g. torch/). The runtime filter in /api/check already drops these from
-- responses, but pruning the source rows is cleaner.
DELETE FROM typosquat_candidates WHERE legitimate LIKE %/%;
