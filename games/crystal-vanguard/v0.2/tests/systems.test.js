import test from 'node:test';
import assert from 'node:assert/strict';

import { PlacementSystem, WaveDirector } from '../src/systems.js';

test('wave schedule expansion is chronological and deterministic', () => {
  const director = new WaveDirector({}, {
    content: {},
    session: {},
    bus: {},
    actorFactory: {},
    combat: {}
  });

  const schedule = director.expandSchedule({
    groups: [
      { monsterId: 'sprout', lane: 'CENTER', count: 3, interval: 1, delay: 2 },
      { monsterId: 'moth', lane: 'LEFT', count: 2, interval: 0.5, delay: 0.5 }
    ]
  }, 0, 1);

  assert.deepEqual(schedule.map((entry) => entry.at), [0.5, 1, 2, 3, 4]);
  assert.equal(schedule[0].monsterId, 'moth');
  assert.equal(schedule.at(-1).monsterId, 'sprout');
});

test('placement grid reports core reserve cells explicitly', () => {
  const placement = new PlacementSystem({}, {
    content: {},
    session: {},
    bus: {},
    actorFactory: {},
    combat: {}
  });

  assert.deepEqual(placement.pointToCell(360, 1086), { gx: 3, gy: 4 });
  assert.equal(placement.isReserved(3, 4), true);
  assert.equal(placement.isReserved(2, 4), true);
  assert.equal(placement.isReserved(3, 3), false);
  assert.equal(placement.pointToCell(5, 5), null);
});
