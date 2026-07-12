import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { ASSETS, DIRECTION_ROWS } from '../src/content.js';


test('Blade runtime declarations match the executable sprite manifest', async () => {
  const raw = await readFile(new URL('../../asset-manifest.json', import.meta.url), 'utf8');
  const manifest = JSON.parse(raw);
  const spriteSet = manifest.sprite_sets.find((entry) => entry.id === 'blade-rank1');
  const runtime = ASSETS.find((asset) => asset.id === 'unit.blade.rank1');
  const manifestAssets = new Map(manifest.assets.map((asset) => [asset.id, asset]));

  assert.ok(spriteSet, 'Missing blade-rank1 sprite set');
  assert.ok(runtime, 'Missing Blade runtime visual');
  assert.deepEqual(manifest.sprite_contract.direction_rows, DIRECTION_ROWS);
  assert.deepEqual(
    manifest.sprite_contract.anchor_px,
    [runtime.anchor.x, runtime.anchor.y],
    'Runtime and QA must evaluate the same canonical root'
  );
  assert.equal(manifest.sprite_contract.normalization_scale_scope, 'unit');
  assert.equal(spriteSet.qa_status, 'needs_rework');
  assert.equal(spriteSet.manual_review.status, 'rejected');
  assert.equal(spriteSet.auto_qa_status, 'failed');
  assert.equal(spriteSet.runtime_usage, 'dev_legacy_placeholder');
  assert.equal(spriteSet.release_eligible, false);
  assert.equal(spriteSet.generation_seed_eligible, false);
  assert.equal(spriteSet.replacement_strategy, 'clean_room');
  assert.equal(spriteSet.approved_seed, null);

  for (const [actionId, actionConfig] of Object.entries(spriteSet.actions)) {
    const asset = manifestAssets.get(actionConfig.asset_id);
    const runtimeAction = runtime.actions[actionId];
    assert.ok(asset, `Missing manifest asset for ${actionId}`);
    assert.ok(runtimeAction, `Missing runtime action for ${actionId}`);
    assert.equal(runtimeAction.url, `../${asset.path}`);
    assert.equal(runtimeAction.frames, asset.grid[0]);
    assert.deepEqual(asset.cell, manifest.sprite_contract.cell);
    assert.equal(asset.grid[1], DIRECTION_ROWS.length);
    assert.ok(actionConfig.comparable_columns.length > 0, `${actionId} needs comparable frames`);
  }
});

test('Blade manifest, audit report, and art backlog agree on rejection state', async () => {
  const [manifestRaw, reportRaw, backlogRaw] = await Promise.all([
    readFile(new URL('../../asset-manifest.json', import.meta.url), 'utf8'),
    readFile(new URL('../../art/blade-rank1/qa/report.json', import.meta.url), 'utf8'),
    readFile(new URL('../asset-backlog.json', import.meta.url), 'utf8')
  ]);
  const manifest = JSON.parse(manifestRaw);
  const report = JSON.parse(reportRaw);
  const backlog = JSON.parse(backlogRaw);
  const spriteSet = manifest.sprite_sets.find((entry) => entry.id === 'blade-rank1');
  const blade = backlog.items.find((item) => item.runtime_asset_id === 'unit.blade.rank1');

  assert.equal(spriteSet.qa_status, 'needs_rework');
  assert.equal(report.declared_qa_status, spriteSet.qa_status);
  assert.equal(report.computed_qa_status, spriteSet.qa_status);
  assert.equal(blade.status, spriteSet.qa_status);
  assert.equal(report.normalization_decision, blade.normalization_decision);
  assert.equal(report.manual_review.status, blade.manual_review_status);
  assert.equal(report.computed_auto_qa_status, blade.auto_qa_status);
  assert.equal(report.runtime_usage, blade.delivery_status);
  assert.equal(report.declared_release_eligible, blade.release_eligible);
  assert.equal(report.generation_seed_eligible, blade.generation_seed_eligible);
  assert.equal(report.replacement_strategy, blade.replacement_strategy);
  assert.equal(report.approved_seed, blade.approved_seed);
  assert.equal(report.summary.declaration_matches_audit, true);
  assert.equal(report.summary.production_eligible, false);
  assert.ok(report.summary.hard_failure_count > 0);
});

test('Frontier r1 remains an isolated rejected archive after structural QA', async () => {
  const [manifestRaw, reportRaw, backlogRaw] = await Promise.all([
    readFile(new URL('../../asset-manifest.json', import.meta.url), 'utf8'),
    readFile(
      new URL('../../art/blade-rank1/revisions/frontier-blade-r1/qa/seed-report.json', import.meta.url),
      'utf8'
    ),
    readFile(new URL('../asset-backlog.json', import.meta.url), 'utf8')
  ]);
  const manifest = JSON.parse(manifestRaw);
  const report = JSON.parse(reportRaw);
  const backlog = JSON.parse(backlogRaw);
  const candidate = manifest.seed_candidates.find((entry) => entry.id === 'blade-rank1-frontier-r1-se');
  const blade = backlog.items.find((item) => item.runtime_asset_id === 'unit.blade.rank1');
  const runtimeUrls = ASSETS.flatMap((asset) => (
    Object.values(asset.actions ?? {}).map((action) => action.url)
  ));

  assert.ok(candidate, 'Missing Frontier Blade candidate');
  assert.equal(candidate.auto_qa_status, 'passed');
  assert.equal(report.auto_qa_status, candidate.auto_qa_status);
  assert.equal(candidate.golden_scale.status, 'approved');
  assert.equal(candidate.golden_scale.envelope_px, 70);
  assert.equal(candidate.review.scale, 'approved');
  assert.equal(report.review.scale, candidate.review.scale);
  assert.equal(report.review.normalized_art, candidate.review.normalized_art);
  assert.equal(report.review.mobile, candidate.review.mobile);
  assert.equal(report.review.semantic_direction, candidate.review.semantic_direction);
  assert.equal(candidate.direction_review.status, 'rejected');
  assert.deepEqual(
    candidate.direction_review.candidates.map((entry) => entry.id),
    ['balanced', 'tactical']
  );
  assert.equal(candidate.review.normalized_art, 'rejected');
  assert.equal(candidate.review.mobile, 'rejected');
  assert.equal(candidate.generation_seed_eligible, false);
  assert.equal(candidate.release_eligible, false);
  assert.equal(blade.active_candidate_id, null);
  assert.equal(blade.archived_candidate_id, candidate.id);
  assert.equal(blade.candidate_golden_scale_px, 70);
  assert.equal(blade.candidate_scale_review_status, 'approved');
  assert.equal(blade.candidate_stage, 'rejected');
  assert.equal(blade.candidate_art_review_status, 'rejected');
  assert.equal(blade.candidate_mobile_review_status, 'rejected');
  assert.ok(runtimeUrls.every((url) => !url.includes('frontier-blade-r1')));
});
