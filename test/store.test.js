import test from 'node:test';
import assert from 'node:assert/strict';
import {spy} from 'sinon';

import Store from '../src/store.js';
import createFeature from './utils/create_feature.js';
import getPublicMemberKeys from './utils/get_public_member_keys.js';
import createMap from './utils/create_map.js';

function createStore() {
  const ctx = {
    options: {
      suppressAPIEvents: true
    },
    map: createMap(),
    events: {
      fire: spy()
    }
  };

  return new Store(ctx);
}

test('Store has correct properties', () => {
  assert.ok(Store, 'store exists');
  assert.ok(typeof Store === 'function', 'store is a function');
});

test('Store constructor and public API', () => {
  const map = createMap();
  const ctx = { map };
  const store = new Store(ctx);

  // instance members
  assert.deepEqual(store.source, [], 'exposes store.sources');
  assert.equal(store.ctx, ctx, 'exposes store.ctx');
  assert.equal(store.ctx.map, map, 'exposes store.ctx.map');
  assert.equal(store.isDirty, false, 'exposes store.isDirty');
  assert.equal(typeof store.render, 'function', 'exposes store.render');

  assert.equal(getPublicMemberKeys(store).length, 4, 'no unexpected instance members');

  // prototype members
  assert.equal(typeof Store.prototype.setDirty, 'function', 'exposes store.setDirty');
  assert.equal(typeof Store.prototype.createRenderBatch, 'function', 'exposes store.createRenderBatch');
  assert.equal(typeof Store.prototype.featureCreated, 'function', 'exposes store.featureCreated');
  assert.equal(typeof Store.prototype.featureChanged, 'function', 'exposes store.featureChanged');
  assert.equal(typeof Store.prototype.getChangedIds, 'function', 'exposes store.getChangedIds');
  assert.equal(typeof Store.prototype.clearChangedIds, 'function', 'exposes store.clearChangedIds');
  assert.equal(typeof Store.prototype.getAllIds, 'function', 'exposes store.getAllIds');
  assert.equal(typeof Store.prototype.add, 'function', 'exposes store.add');
  assert.equal(typeof Store.prototype.get, 'function', 'exposes store.get');
  assert.equal(typeof Store.prototype.getAll, 'function', 'exposes store.getAll');
  assert.equal(typeof Store.prototype.select, 'function', 'exposes store.select');
  assert.equal(typeof Store.prototype.deselect, 'function', 'exposes store.deselect');
  assert.equal(typeof Store.prototype.clearSelected, 'function', 'exposes store.clearSelected');
  assert.equal(typeof Store.prototype.getSelectedIds, 'function', 'exposes store.getSelectedIds');
  assert.equal(typeof Store.prototype.getSelected, 'function', 'exposes store.getSelected');
  assert.equal(typeof Store.prototype.isSelected, 'function', 'exposes store.isSelected');
  assert.equal(typeof Store.prototype.delete, 'function', 'exposes store.delete');
  assert.equal(typeof Store.prototype.setSelected, 'function', 'exposes store.setSelected');
  assert.equal(typeof Store.prototype.setSelectedCoordinates, 'function', 'exposes store.setSelectedCoordinates');
  assert.equal(typeof Store.prototype.getSelectedCoordinates, 'function', 'exposes store.getSelectedCoordinates');
  assert.equal(typeof Store.prototype.clearSelectedCoordinates, 'function', 'exposes store.clearSelectedCoordinates');
  assert.equal(typeof Store.prototype.setFeatureProperty, 'function', 'exposes store.setFeatureProperty');
  assert.equal(typeof Store.prototype.storeMapConfig, 'function', 'exposes store.storeMapConfig');
  assert.equal(typeof Store.prototype.restoreMapConfig, 'function', 'exposes store.restoreMapConfig');
  assert.equal(typeof Store.prototype.getInitialConfigValue, 'function', 'exposes store.getInitialConfigValue');

  assert.equal(getPublicMemberKeys(Store.prototype).length, 25, 'no untested prototype members');
});

test('Store#setDirty', () => {
  const store = createStore();
  assert.equal(store.isDirty, false);
  store.setDirty();
  assert.equal(store.isDirty, true);
});

test('Store#createRenderBatch', () => {
  const store = createStore();
  let numRenders = 0;
  store.render = function() {
    numRenders++;
  };
  store.render();
  assert.equal(numRenders, 1, 'render incrementes number of renders');
  let renderBatch = store.createRenderBatch();
  store.render();
  store.render();
  store.render();
  assert.equal(numRenders, 1, 'when batching render doesn\'t get incremented');
  renderBatch();
  assert.equal(numRenders, 2, 'when releasing batch, render only happens once');

  renderBatch = store.createRenderBatch();
  renderBatch();
  assert.equal(numRenders, 2, 'when releasing batch, render doesn\'t happen if render wasn\'t called');
});

test('Store#featureChanged, Store#getChangedIds, Store#clearChangedIds', () => {
  const store = createStore();
  assert.deepEqual(store.getChangedIds(), []);
  store.featureChanged('x');
  assert.deepEqual(store.getChangedIds(), ['x']);
  store.featureChanged('y');
  assert.deepEqual(store.getChangedIds(), ['x', 'y']);
  store.featureChanged('x');
  assert.deepEqual(store.getChangedIds(), ['x', 'y'], 'ids do not duplicate');
  store.clearChangedIds();
  assert.deepEqual(store.getChangedIds(), []);
});

test('Store#add, Store#get, Store#getAll', () => {
  const store = createStore();
  assert.equal(store.get(1), undefined);
  assert.deepEqual(store.getAll(), []);
  const point = createFeature('point');
  const line = createFeature('line');
  store.add(point);
  assert.equal(store.get(point.id), point);
  assert.deepEqual(store.getAll(), [point]);
  store.add(line);
  assert.equal(store.get(point.id), point);
  assert.equal(store.get(line.id), line);
  assert.deepEqual(store.getAll(), [point, line]);
  store.add(point);
  assert.equal(store.get(point.id), point);
  assert.equal(store.get(line.id), line);
  assert.deepEqual(store.getAll(), [point, line]);
});

test('selection methods', async (t) => {
  const store = createStore();
  const f1 = createFeature('point');
  store.add(f1);
  const f2 = createFeature('point');
  store.add(f2);
  const f3 = createFeature('point');
  store.add(f3);
  const f4 = createFeature('point');
  store.add(f4);

  assert.deepEqual(store.getSelectedIds(), []);

  t.test('select one feature', () => {
    store.select(f1.id);
    assert.deepEqual(store.getSelectedIds(), [f1.id], 'f1 returns in selected ids array');
    assert.deepEqual(store.getSelected(), [f1.toGeoJSON()], 'f1 returns in selected array');
    assert.equal(store.isSelected(f1.id), true, 'isSelected affirms f1');
    assert.equal(store.isSelected(f2.id), false, 'isSelected rejects f2');
  });

  await t.test('select a second feature', () => {
    store.select(f2.id);
    assert.deepEqual(store.getSelectedIds(), [f1.id, f2.id], 'f1 and f2 return in selected ids array');
    assert.deepEqual(store.getSelected(), [f1, f2], 'f1 and f2 return in selected array');
    assert.equal(store.isSelected(f1.id), true, 'isSelected affirms f1');
    assert.equal(store.isSelected(f2.id), true, 'isSelected affirms f2');
  });

  await t.test('try to re-select first feature', () => {
    store.select(f1.id);
  });

  await t.test('deselect a feature', () => {
    store.deselect(f1.id);
    assert.deepEqual(store.getSelectedIds(), [f2.id], 'deselection of f1 clears it from selected array');
  });

  await t.test('serially select more features', () => {
    store.select(f3.id);
    store.select(f4.id);
    assert.deepEqual(store.getSelectedIds(), [f2.id, f3.id, f4.id], 'serial selection of f3 and f4 reflected in selected array');
  });

  await t.test('clear selection', () => {
    store.clearSelected();
    assert.deepEqual(store.getSelectedIds(), []);
  });

  t.test('select an array of features', () => {
    store.select([f1.id, f3.id, f4.id]);
    assert.deepEqual(store.getSelectedIds(), [f1.id, f3.id, f4.id]);
  });

  await t.test('deselect an array of features', () => {
    store.deselect([f1.id, f4.id]);
    assert.deepEqual(store.getSelectedIds(), [f3.id]);
  });
});

test('Store#delete', () => {
  const store = createStore();
  const point = createFeature('point');
  const line = createFeature('line');
  const polygon = createFeature('polygon');

  store.add(point);
  store.add(line);
  store.add(polygon);
  assert.deepEqual(store.getAll(), [point, line, polygon]);
  assert.deepEqual(store.getAllIds(), [point.id, line.id, polygon.id]);

  assert.deepEqual(store.getSelectedIds(), []);
  store.select(line.id);
  assert.deepEqual(store.getSelectedIds(), [line.id]);

  store.delete(line.id);
  assert.deepEqual(store.getAll(), [point, polygon]);
  assert.deepEqual(store.getAllIds(), [point.id, polygon.id]);
  assert.deepEqual(store.getSelectedIds(), []);
  assert.equal(store.isDirty, true, 'after deletion store is dirty');
});

test('Store#setSelected', () => {
  const store = createStore();
  const point = createFeature('point');
  const line = createFeature('line');
  const polygon = createFeature('polygon');

  store.setSelected(point.id, {silent: true});
  assert.deepEqual(store.getSelectedIds(), [point.id]);

  store.setSelected([line.id, polygon.id], {silent: true});
  assert.deepEqual(store.getSelectedIds(), [line.id, polygon.id]);

  store.setSelected(line.id, {silent: true});
  assert.deepEqual(store.getSelectedIds(), [line.id]);

  store.setSelected(undefined, {silent: true});
  assert.deepEqual(store.getSelectedIds(), []);
});

test('Store#setFeatureProperty', () => {
  const store = createStore();
  const point = createFeature('point');

  store.add(point);
  store.clearChangedIds();
  store.setFeatureProperty(point.id, 'size', 200);
  assert.deepEqual(store.getChangedIds(), [point.id]);
  assert.equal(store.get(point.id).properties.size, 200, 'sets the property on the feature');
});

test('Store#storeAndRestoreMapConfig', () => {
  const map = createMap();
  // Disable doubleClickZoom
  map.doubleClickZoom.disable();
  // Check it's disabled
  assert.equal(map.doubleClickZoom.isEnabled(), false, 'Disables doubleClickZoom on the map');
  const ctx = { map };
  const store = new Store(ctx);
  store.storeMapConfig();
  // Check we can get the initial state of it
  assert.equal(store.getInitialConfigValue('doubleClickZoom'), false, 'Retrieves the initial value for the doubleClickZoom');
  // Enable it again, byt then use restore to reset the initial state
  map.doubleClickZoom.enable();
  store.restoreMapConfig();
  assert.equal(map.doubleClickZoom.isEnabled(), false, 'Restores doubleClickZoom on the map');
});
