import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { ASSETS } from '../src/content.js';

test('every runtime visual has an art-backlog record', async () => {
  const raw = await readFile(new URL('../asset-backlog.json', import.meta.url), 'utf8');
  const backlog = JSON.parse(raw);
  const byRuntimeId = new Map(
    backlog.items
      .filter((item) => item.runtime_asset_id)
      .map((item) => [item.runtime_asset_id, item])
  );

  for (const asset of ASSETS) {
    const item = byRuntimeId.get(asset.id);
    assert.ok(item, `Missing backlog record for ${asset.id}`);
    assert.ok(backlog.status_values.includes(item.status), `Unknown art status for ${asset.id}`);

    if (asset.status === 'ready') {
      assert.equal(
        item.delivery_status,
        'dev_legacy_placeholder',
        `Runtime-ready asset ${asset.id} must declare its development delivery state`
      );
    } else {
      assert.equal(item.status, 'placeholder_in_game', `Placeholder status drift for ${asset.id}`);
    }
  }
});

test('runtime loadability is separate from Blade art approval', async () => {
  const raw = await readFile(new URL('../asset-backlog.json', import.meta.url), 'utf8');
  const backlog = JSON.parse(raw);
  const blade = backlog.items.find((item) => item.runtime_asset_id === 'unit.blade.rank1');

  assert.equal(blade.delivery_status, 'dev_legacy_placeholder');
  assert.equal(blade.status, 'needs_rework');
  assert.equal(blade.auto_qa_status, 'failed');
  assert.equal(blade.manual_review_status, 'rejected');
  assert.equal(blade.release_eligible, false);
  assert.equal(blade.generation_seed_eligible, false);
  assert.equal(blade.replacement_strategy, 'clean_room');
  assert.equal(blade.approved_seed, null);
  assert.equal(blade.normalization_decision, 'clean_room_replace');
  assert.match(blade.qa_report, /blade-rank1\/qa\/report\.json$/);
});
