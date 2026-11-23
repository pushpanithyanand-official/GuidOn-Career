import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const get = path => readFileSync(new URL(path, root), 'utf8');

const required = [
  'docs/ARCHITECTURE_DATA_AI_EFFICIENCY_SPEC.md',
  'docs/DATABASE_CANONICAL_SCHEMA.md',
  'docs/INTEGRATED_PIPELINE_AND_PHASE_GATES.md',
  'docs/GUIDON_CAREER_MASTER_PLAN.md',
  'docs/BACKEND_CONTRACT.md',
  'docs/MASTER_PLAN_STAGE_AUDIT.md',
];

test('new architecture references exist and keep the earlier master-plan scope', () => {
  for (const path of required) assert.ok(existsSync(new URL(path, root)), path);
  const master = get('docs/GUIDON_CAREER_MASTER_PLAN.md');
  assert.match(master, /# Addendum v1\.6 — Canonical Data Architecture/);
  for (let phase = 0; phase < 10; phase++) {
    assert.match(master, new RegExp('Phase ' + phase + ' [—-]'), 'Original phase ' + phase);
  }
  for (const title of ['CV_BUILDER_STRICT_SPEC.md',
    'DATABASE_CANONICAL_SCHEMA.md','ARCHITECTURE_DATA_AI_EFFICIENCY_SPEC.md',
    'INTEGRATED_PIPELINE_AND_PHASE_GATES.md']) {
    assert.ok(master.includes(title), 'Missing master link '+title);
  }
});

test('architecture classifies data and forbids untrusted AI and cross-user assertions', () => {
  const architecture = get('docs/ARCHITECTURE_DATA_AI_EFFICIENCY_SPEC.md');
  for (const term of ['Public', 'Shared catalogue', 'User-private', 'Restricted internal',
    'inputVersionHash', 'cachedInputTokens', 'source of truth', 'zero']) {
    assert.match(architecture.toLowerCase(), new RegExp(term.toLowerCase()), term);
  }
  const schema = get('docs/DATABASE_CANONICAL_SCHEMA.md');
  for(const term of ['sparkUsers','users/{uid}','server-owned','preCvScore','reversible']) {
    assert.ok(schema.includes(term),'Missing database migration/security term '+term);
  }
  const pipeline = get('docs/INTEGRATED_PIPELINE_AND_PHASE_GATES.md');
  for(const term of ['Gmail', 'Chrome extension', 'ATS', 'Raw ATS', 'Recruiter Fit',
    'Next, Continue, Apply or Submit', 'applicationId']) {
    assert.ok(pipeline.includes(term),'Missing pipeline invariant '+term);
  }
});

test('new docs do not contain broken relative Markdown paths', () => {
  const docs = required.slice(0, 3);
  for (const path of docs) {
    const file = get(path);
    for(const match of file.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
      const target = new URL(match[1], new URL(path, root));
      assert.ok(existsSync(target), `Broken link in ${path}: ${match[1]}`);
    }
  }
});
