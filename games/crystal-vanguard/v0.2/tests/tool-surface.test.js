import test from 'node:test';
import assert from 'node:assert/strict';

import { createContentRegistry } from '../src/content.js';
import { createToolButtonModel } from '../src/ui.js';

test('deployment tool surface is generated from content registry entries', () => {
  const registry = createContentRegistry();
  const models = registry.all('tool').map((tool) => createToolButtonModel(registry, tool));

  assert.deepEqual(models.map((model) => model.id), [
    'unit:blade',
    'building:barricade',
    'building:bolt-tower'
  ]);
  assert.deepEqual(models.map((model) => model.icon), ['⚔', '▥', '⌁']);
  assert.deepEqual(models.map((model) => model.cost), [4, 3, 5]);
  assert.ok(models.every((model) => model.meta.includes(`${model.cost}G`)));
});
