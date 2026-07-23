import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('A3-Y is authorized only as a non-production stage while A4-01 remains open', () => {
  const programState = read('docs/program-state.md');

  assert.match(programState, /A3-Y - Repository Consolidation/);
  assert.match(programState, /Classification: Non-production engineering stage/);
  assert.match(programState, /Does not satisfy A4-01/);
  assert.match(programState, /Does not authorize production claims/);
  assert.match(programState, /Current gate: A4-01 Infrastructure Ownership Confirmation/);
  assert.match(programState, /Production ready: No/);
});

test('A3-Y preservation evidence records dirty worktree and no production advancement', () => {
  const evidence = read('docs/evidence/a3-y/PREEXISTING_WORKTREE_STATE.md');

  assert.match(evidence, /Repository root:/);
  assert.match(evidence, /Branch: `future-release-backlog`/);
  assert.match(evidence, /Preexisting Modified Files/);
  assert.match(evidence, /Preexisting Untracked Files and Folders/);
  assert.match(evidence, /A4-01 was not advanced/);
});

test('canonical implementation matrix does not mark any domain live production', () => {
  const matrix = read('docs/CANONICAL_IMPLEMENTATION_REALITY_MATRIX.md');

  assert.match(matrix, /Authentication/);
  assert.match(matrix, /Booking/);
  assert.match(matrix, /Database persistence/);
  assert.match(matrix, /Infrastructure/);
  assert.doesNotMatch(matrix, /\|\s*[^|\n]+\s*\|\s*LIVE_PRODUCTION\s*\|/);
});

test('baseline reconciliation states old failing test count is obsolete', () => {
  const reconciliation = read('docs/evidence/a3-y/BASELINE_RECONCILIATION.md');

  assert.match(reconciliation, /Previous 12 failing frontend tests/);
  assert.match(reconciliation, /Resolved by later baseline/);
  assert.match(reconciliation, /596\/596/);
  assert.match(reconciliation, /114\/114/);
  assert.match(reconciliation, /710\/710/);
});

test('A3-Y report records completed non-production engineering gate without production claims', () => {
  const report = read('docs/evidence/a3-y/A3_Y_COMPLETION_REPORT.md');

  assert.match(report, /COMPLETE - NON-PRODUCTION ENGINEERING GATE PASSED/);
  assert.match(report, /No product feature behavior was changed in this batch/);
  assert.match(report, /A3-Y does not satisfy A4-01/);
  assert.match(report, /does not certify production readiness/);
});
