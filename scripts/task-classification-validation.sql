-- Validation query pack for task classification

-- 1) Distribution by life/domain/effort
SELECT
  COALESCE(life_bucket, 'NULL') AS life_bucket,
  COALESCE(domain, 'NULL') AS domain,
  COALESCE(effort_bucket, 'NULL') AS effort_bucket,
  COUNT(*) AS tasks
FROM tasks
GROUP BY 1,2,3
ORDER BY tasks DESC;

-- 2) Unclassified or low-confidence queue
SELECT id, title, status, priority, classification_confidence, life_bucket, domain, effort_bucket
FROM tasks
WHERE domain IS NULL
   OR life_bucket IS NULL
   OR effort_bucket IS NULL
   OR classification_confidence < 0.7
ORDER BY classification_confidence ASC, datetime(updated_at) DESC
LIMIT 100;

-- 3) Tasks likely TurboTenant/work
SELECT id, title, status, priority, updated_at, classification_confidence
FROM tasks
WHERE life_bucket = 'work'
  AND domain IN ('turbotenant', 'mission-control')
  AND status NOT IN ('done')
ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
         datetime(updated_at) DESC;

-- 4) Manual overrides audit
SELECT id, title, life_bucket, domain, effort_bucket, classification_confidence, classification_source, updated_at
FROM tasks
WHERE classification_source = 'manual'
ORDER BY datetime(updated_at) DESC
LIMIT 100;

-- 5) Confidence histogram
SELECT
  CASE
    WHEN classification_confidence >= 0.9 THEN '0.90-1.00'
    WHEN classification_confidence >= 0.8 THEN '0.80-0.89'
    WHEN classification_confidence >= 0.7 THEN '0.70-0.79'
    WHEN classification_confidence >= 0.6 THEN '0.60-0.69'
    ELSE '<0.60'
  END AS bucket,
  COUNT(*) AS tasks
FROM tasks
GROUP BY 1
ORDER BY bucket DESC;
