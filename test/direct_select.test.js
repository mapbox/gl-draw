/* eslint no-shadow:[0] */
import test from 'node:test';
import assert from 'node:assert/strict';
import turfCentroid from '@turf/centroid';
import createSyntheticEvent from 'synthetic-dom-events';
import {spy} from 'sinon';

import MapboxDraw from '../index.js';
import click from './utils/mouse_click.js';
import tap from './utils/touch_tap.js';
import getGeoJSON from './utils/get_geojson.js';
import createMap from './utils/create_map.js';
import {setupAfterNextRender} from './utils/after_next_render.js';
import makeMouseEvent from './utils/make_mouse_event.js';
import makeTouchEvent from './utils/make_touch_event.js';
import * as Constants from '../src/constants.js';

test('direct_select', async (t) => {
  const mapContainer = document.createElement('div');
  document.body.appendChild(mapContainer);
  const map = createMap({ container: mapContainer });

  const Draw = new MapboxDraw();
  map.addControl(Draw);

  spy(map, 'fire');

  const afterNextRender = setupAfterNextRender(map);

  const cleanUp = async function() {
    Draw.deleteAll();
    map.fire.resetHistory();
    await afterNextRender();
  };

  const getFireArgs = function() {
    const args = [];
    for (let i = 0; i < map.fire.callCount; i++) {
      args.push(map.fire.getCall(i).args);
    }
    return args;
  };

  t.test('direct_select - init map for tests', () => {
    const done = function() {
      map.off('load', done);
    };

    if (map.loaded()) {
      done();
    } else {
      map.on('load', done);
    }
  });

  await t.test('direct_select - double click should not disable enabled dragPan', async () => {
    const ids = Draw.add(getGeoJSON('polygon'));

    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: ids[0]
    });

    await afterNextRender();

    spy(map.dragPan, 'enable');

    for (let i = 0; i < 2; i++) {
      map.fire('mousedown', makeMouseEvent(35, 25));
      await afterNextRender();
    }

    map.fire('mousemove', makeMouseEvent(0, 0));

    assert.equal(map.dragPan.enable.callCount, 1, 'dragPan.enable called');

    map.dragPan.enable.restore();
  });


  await t.test('direct_select - should fire correct actionable when no vertices selected', async () => {
    const ids = Draw.add(getGeoJSON('polygon'));
    Draw.changeMode(Constants.modes.SIMPLE_SELECT, {
      featureIds: ids
    });

    await afterNextRender();

    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: ids[0]
    });

    await afterNextRender();

    const actionableArgs = getFireArgs().filter(arg => arg[0] === 'draw.actionable');
    assert.ok(actionableArgs.length > 0, 'should have fired an actionable event');
    if (actionableArgs.length > 0) {
      const actionable = actionableArgs[actionableArgs.length - 1][1];
      assert.equal(actionable.actions.combineFeatures, false, 'should fire correct combine actionable');
      assert.equal(actionable.actions.uncombineFeatures, false, 'should fire correct uncombine actionable');
      assert.equal(actionable.actions.trash, false, 'should fire correct trash actionable');
    }

    await cleanUp();
  });

  await t.test('direct_select - should fire correct actionable when a vertex is selected by clicking', async () => {
    const ids = Draw.add(getGeoJSON('polygon'));
    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: ids[0]
    });
    const clickAt = getGeoJSON('polygon').geometry.coordinates[0][0];
    await afterNextRender();

    click(map, makeMouseEvent(clickAt[0], clickAt[1]));

    await afterNextRender();
    const actionableArgs = getFireArgs().filter(arg => arg[0] === 'draw.actionable');
    assert.ok(actionableArgs.length > 0, 'should have fired an actionable event');
    if (actionableArgs.length > 0) {
      const actionable = actionableArgs[actionableArgs.length - 1][1];
      assert.equal(actionable.actions.combineFeatures, false, 'should fire correct combine actionable');
      assert.equal(actionable.actions.uncombineFeatures, false, 'should fire correct uncombine actionable');
      assert.equal(actionable.actions.trash, true, 'should fire correct trash actionable');
    }

    await cleanUp();
  });

  await t.test('direct_select - should fire correct actionable when a vertex is selected by tapping', async () => {
    const ids = Draw.add(getGeoJSON('polygon'));
    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: ids[0]
    });
    const tapAt = getGeoJSON('polygon').geometry.coordinates[0][0];
    await afterNextRender();

    tap(map, makeTouchEvent(tapAt[0], tapAt[1]));
    await afterNextRender();

    const actionableArgs = getFireArgs().filter(arg => arg[0] === 'draw.actionable');
    assert.ok(actionableArgs.length > 0, 'should have fired an actionable event');
    if (actionableArgs.length > 0) {
      const actionable = actionableArgs[actionableArgs.length - 1][1];
      assert.equal(actionable.actions.combineFeatures, false, 'should fire correct combine actionable');
      assert.equal(actionable.actions.uncombineFeatures, false, 'should fire correct uncombine actionable');
      assert.equal(actionable.actions.trash, true, 'should fire correct trash actionable');
    }

    await cleanUp();
  });

  await t.test('direct_select - trashing vertices should delete the correct ones', async () => {
    const longLine = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [[0, 0], [10, 0], [20, 0], [30, 0], [40, 0], [50, 0], [60, 0], [70, 0], [80, 0], [80, 10], [70, 10], [60, 10], [50, 10]]
      }
    };
    const ids = Draw.add(longLine);
    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: ids[0]
    });

    await afterNextRender();
    // select multiple nodes at indices 9, 10, 11
    click(map, makeMouseEvent(70, 10, { shiftKey: true }));
    click(map, makeMouseEvent(80, 10, { shiftKey: true }));
    click(map, makeMouseEvent(60, 10, { shiftKey: true }));
    await afterNextRender();
    Draw.trash();
    const afterTrash = Draw.get(ids[0]);
    assert.deepEqual(afterTrash.geometry.coordinates, [[0, 0], [10, 0], [20, 0], [30, 0], [40, 0], [50, 0], [60, 0], [70, 0], [80, 0], [50, 10]]);
    await cleanUp();
  });

  await t.test('direct_select - a click on a vertex and than dragging the map shouldn\'t drag the vertex', async () => {
    const ids = Draw.add(getGeoJSON('polygon'));
    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: ids[0]
    });

    const clickAt = getGeoJSON('polygon').geometry.coordinates[0][0];
    await afterNextRender();
    click(map, makeMouseEvent(clickAt[0], clickAt[1]));
    await afterNextRender();
    map.fire('mousedown', makeMouseEvent(clickAt[0] + 15, clickAt[1] + 15));
    map.fire('mousemove', makeMouseEvent(clickAt[0] + 30, clickAt[1] + 30, { buttons: 1 }));
    map.fire('mouseup', makeMouseEvent(clickAt[0] + 30, clickAt[1] + 30));
    const afterMove = Draw.get(ids[0]);
    assert.deepEqual(getGeoJSON('polygon').geometry, afterMove.geometry, 'should be the same after the drag');
    await cleanUp();
  });

  await t.test('direct_select - fire one update when dragging mouse leaves container and button is released outside', async () => {
    const ids = Draw.add(getGeoJSON('polygon'));
    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: ids[0]
    });

    const startPosition = getGeoJSON('polygon').geometry.coordinates[0][1];
    await afterNextRender();
    click(map, makeMouseEvent(startPosition[0], startPosition[1]));
    await afterNextRender();
    map.fire.resetHistory();
    map.fire('mousedown', makeMouseEvent(startPosition[0], startPosition[1]));
    map.fire('mousemove', makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }));
    mapContainer.dispatchEvent(createSyntheticEvent('mouseout'));
    map.fire('mousemove', makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30), { buttons: 1 });
    map.fire('mouseup', makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30));

    const afterMove = Draw.get(ids[0]);
    const args = getFireArgs().filter(arg => arg[0] === 'draw.update');
    assert.equal(args.length, 1, 'draw.update called once');
    assert.equal(afterMove.geometry.coordinates[0][1][0], startPosition[0] + 15, 'point lng moved only the first amount');
    assert.equal(afterMove.geometry.coordinates[0][1][1], startPosition[1] + 15, 'point lat moved only the first amount');

    await cleanUp();
  });

  await t.test('direct_select - fire two updates when dragging mouse leaves container then returns and button is released inside', async () => {
    const ids = Draw.add(getGeoJSON('polygon'));
    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: ids[0]
    });

    const startPosition = getGeoJSON('polygon').geometry.coordinates[0][1];
    await afterNextRender();
    click(map, makeMouseEvent(startPosition[0], startPosition[1]));
    await afterNextRender();
    map.fire.resetHistory();
    map.fire('mousedown', makeMouseEvent(startPosition[0], startPosition[1]));
    map.fire('mousemove', makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }));
    mapContainer.dispatchEvent(createSyntheticEvent('mouseout'));
    map.fire('mousemove', makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30, { buttons: 1 }));
    map.fire('mouseup', makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30));

    const afterMove = Draw.get(ids[0]);
    const args = getFireArgs().filter(arg => arg[0] === 'draw.update');
    assert.equal(args.length, 2, 'draw.update called twice');
    assert.equal(afterMove.geometry.coordinates[0][1][0], startPosition[0] + 30, 'point lng moved to the mouseup location');
    assert.equal(afterMove.geometry.coordinates[0][1][1], startPosition[1] + 30, 'point lat moved to the mouseup location');

    await cleanUp();
  });

  await t.test('direct_select - drag feature if no vertices are selected', async () => {
    const [polygonId] = Draw.add(getGeoJSON('polygon'));
    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: polygonId
    });

    const startPosition = getGeoJSON('polygon').geometry.coordinates[0][1];
    const centroid = turfCentroid(getGeoJSON('polygon')).geometry.coordinates;
    await afterNextRender();
    map.fire.resetHistory();
    click(map, makeMouseEvent(centroid[0], centroid[1]));
    map.fire('mousedown', makeMouseEvent(centroid[0], centroid[1]));
    map.fire('mousemove', makeMouseEvent(centroid[0] + 15, centroid[1] + 15, { buttons: 1 }));
    map.fire('mouseup', makeMouseEvent(centroid[0] + 15, centroid[1] + 15));

    const afterMove = Draw.get(polygonId);
    const args = getFireArgs().filter(arg => arg[0] === 'draw.update');
    assert.equal(args.length, 1, 'draw.update called once');
    assert.equal(afterMove.geometry.coordinates[0][1][0], startPosition[0] + 15, 'point lng moved to the mouseup location');
    assert.equal(afterMove.geometry.coordinates[0][1][1], startPosition[1] + 15, 'point lat moved to the mouseup location');

    await cleanUp();
  });

  await t.test('direct_select - dragging a selected vertex updates stored coordinates', async () => {
    const [lineId] = Draw.add(getGeoJSON('line'));
    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: lineId
    });

    assert.equal(Draw.getSelectedPoints().features[0], undefined, 'no initial selection');

    const startPosition = getGeoJSON('line').geometry.coordinates[0];
    const endPosition = [startPosition[0] + 10, startPosition[1] + 10];
    await afterNextRender();

    map.fire.resetHistory();
    click(map, makeMouseEvent(startPosition[0], startPosition[1]));
    assert.deepEqual(Draw.getSelectedPoints().features[0].geometry.coordinates, startPosition, 'click saves selection');

    map.fire('mousedown', makeMouseEvent(startPosition[0], startPosition[1]));
    map.fire('mousemove', makeMouseEvent(endPosition[0], endPosition[1], { buttons: 1 }));
    map.fire('mouseup', makeMouseEvent(endPosition[0], endPosition[1]));
    await afterNextRender();

    assert.deepEqual(Draw.getSelectedPoints().features[0].geometry.coordinates, endPosition, 'selection is accurate after dragging');
    await cleanUp();
  });

  t.test('direct_select - clicking an inactive feature should select it', (st) => {
    const [lineId] = Draw.add(getGeoJSON('line'));
    const [polygonId] = Draw.add(getGeoJSON('polygon'));
    Draw.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId: lineId
    });
    const clickAt = getGeoJSON('polygon').geometry.coordinates[0][0];
    afterNextRender(() => {
      click(map, makeMouseEvent(clickAt[0], clickAt[1]));
      map.fire.resetHistory();
      afterNextRender(() => {
        const args = getFireArgs().filter(arg => arg[0] === 'draw.selectionchange');
        t.equal(args.length, 1, 'should have one and only one selectionchange event');
        t.equal(Draw.getSelectedIds().indexOf(polygonId) !== -1, true, 'polygon is now selected');
        cleanUp(() => st.end());
      });
    });
  });

  document.body.removeChild(mapContainer);
});
