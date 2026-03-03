#!/usr/bin/env node
import Database from 'better-sqlite3';

const DB_PATH = process.env.MC_DB_PATH || 'mission-control.db';
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_UNSET = process.argv.includes('--only-unset');

const domains = [
  {
    name: 'turbotenant',
    life: 'work',
    confidence: 0.9,
    patterns: [/\bturbotenant\b/i, /\btenant\b/i, /\bturnovers?\b/i, /\brent butter\b/i, /\bdu presentation\b/i],
  },
  {
    name: 'mission-control',
    life: 'work',
    confidence: 0.85,
    patterns: [/\bmission control\b/i, /\bplanning loop\b/i, /conversation to task/i, /\bpr\s*#\d+/i, /smoke test/i],
  },
  {
    name: 'wetriedit',
    life: 'other',
    confidence: 0.85,
    patterns: [/\bwetried\b/i, /\baffiliate\b/i, /\blasso\b/i, /\bwordpress\b/i, /\baffluent\b/i],
  },
  {
    name: 'family',
    life: 'home',
    confidence: 0.85,
    patterns: [/\bscarlett\b/i, /\bteddy\b/i, /\bschool\b/i, /\bdance\b/i, /\bjessica\b/i, /\bfamily\b/i],
  },
  {
    name: 'personal-admin',
    life: 'home',
    confidence: 0.82,
    patterns: [/\bbilling\b/i, /\binsurance\b/i, /\bautopay\b/i, /\brenewal\b/i, /\bchase\b/i, /\bboost\b/i],
  },
  {
    name: 'finance',
    life: 'home',
    confidence: 0.78,
    patterns: [/\bfinance\b/i, /\binvoice\b/i, /\bpayment\b/i],
  },
];

const effortRules = [
  { value: 'quick-win', patterns: [/reply needed/i, /follow-up/i, /\blog\b/i, /\bcheck\b/i], confidence: 0.82 },
  { value: 'admin', patterns: [/billing/i, /reminder/i, /renewal/i, /finance/i, /insurance/i], confidence: 0.82 },
  { value: 'deep-work', patterns: [/roadmap/i, /build/i, /system/i, /implementation/i, /pipeline/i, /phase/i], confidence: 0.82 },
];

function classifyText(text) {
  const hits = [];
  for (const domain of domains) {
    const matched = domain.patterns.some((rx) => rx.test(text));
    if (matched) hits.push(domain);
  }

  if (hits.length === 0) {
    return { life_bucket: 'other', domain: 'other', confidence: 0.3 };
  }

  if (hits.length === 1) {
    return {
      life_bucket: hits[0].life,
      domain: hits[0].name,
      confidence: hits[0].confidence,
    };
  }

  const rank = {
    turbotenant: 6,
    'mission-control': 5,
    wetriedit: 4,
    family: 3,
    'personal-admin': 2,
    finance: 1,
  };
  const top = hits.sort((a, b) => (rank[b.name] || 0) - (rank[a.name] || 0))[0];

  return {
    life_bucket: top.life,
    domain: top.name,
    confidence: 0.6,
  };
}

function classifyEffort(text) {
  for (const rule of effortRules) {
    if (rule.patterns.some((rx) => rx.test(text))) {
      return { effort_bucket: rule.value, confidence: rule.confidence };
    }
  }
  return { effort_bucket: 'deep-work', confidence: 0.45 };
}

const db = new Database(DB_PATH);

const where = ONLY_UNSET
  ? "WHERE classification_source IS NULL OR classification_source = '' OR (classification_source='auto' AND (domain IS NULL OR life_bucket IS NULL OR effort_bucket IS NULL))"
  : "WHERE classification_source IS NULL OR classification_source != 'manual'";

const tasks = db.prepare(`
  SELECT id, title, COALESCE(description, '') as description, COALESCE(tags, '') as tags
  FROM tasks
  ${where}
`).all();

const results = tasks.map((task) => {
  const text = `${task.title}\n${task.description}\n${task.tags}`;
  const domain = classifyText(text);
  const effort = classifyEffort(text);
  const confidence = Math.max(0, Math.min(1, Number(((domain.confidence + effort.confidence) / 2).toFixed(2))));

  return {
    id: task.id,
    title: task.title,
    life_bucket: domain.life_bucket,
    domain: domain.domain,
    effort_bucket: effort.effort_bucket,
    classification_confidence: confidence,
    classification_source: 'auto',
  };
});

if (DRY_RUN) {
  const summary = results.reduce((acc, r) => {
    const key = `${r.life_bucket}/${r.domain}/${r.effort_bucket}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log(`Dry run: ${results.length} tasks would be classified.`);
  console.log('Summary:');
  Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\nSample (top 15):');
  results.slice(0, 15).forEach((r) => {
    console.log(`- ${r.title} -> ${r.life_bucket} | ${r.domain} | ${r.effort_bucket} (${r.classification_confidence})`);
  });

  process.exit(0);
}

const update = db.prepare(`
  UPDATE tasks
  SET
    life_bucket = @life_bucket,
    domain = @domain,
    effort_bucket = @effort_bucket,
    classification_confidence = @classification_confidence,
    classification_source = @classification_source,
    updated_at = datetime('now')
  WHERE id = @id
`);

const tx = db.transaction((rows) => {
  for (const row of rows) update.run(row);
});

tx(results);
console.log(`Updated ${results.length} task classifications in ${DB_PATH}`);
