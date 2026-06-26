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

    const expectedStatus = asset.status === 'ready' ? 'integrated' : 'placeholder_in_game';
    assert.equal(item.status, expectedStatus, `Status drift for ${asset.id}`);
  }
});
