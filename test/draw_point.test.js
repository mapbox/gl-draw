import test from 'tape';
import mapboxgl from 'mapbox-gl-js-mock';
import createSyntheticEvent from 'synthetic-dom-events';
import GLDraw from '../';
import { click, accessToken, createMap } from './test_utils';
import makeMouseEvent from './utils/make_mouse_event';
import CommonSelectors from '../src/lib/common_selectors';
import drawPointMode from '../src/modes/draw_point';
import Point from '../src/feature_types/point';
import spy from 'sinon/lib/sinon/spy'; // avoid babel-register-related error by importing only spy

function createMockContext() {
  return {
    store: {
      add: spy(),
      delete: spy(),
      featureChanged: spy(),
      clearSelected: spy()
    },
    events: {
      changeMode: spy()
    },
    ui: {
      queueMapClasses: spy(),
      setActiveButton: spy()
    },
    _test: {}
  };
}

function createMockLifecycleContext() {
  return {
    on: spy()
  };
}

test('draw_point mode initialization', t => {
  const context = createMockContext();
  drawPointMode(context);

  t.equal(context.store.add.callCount, 1, 'store.add called');

  const emptypoint = new Point(context, {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: []
    }
  });
  // Strip ids for this comparison
  t.deepEqual(Object.assign(context.store.add.getCall(0).args[0], { id: null }),
    Object.assign(emptypoint, { id: null }), 'with a new line');

  t.end();
});

test('draw_point start', t => {
  const context = createMockContext();
  const lifecycleContext = createMockLifecycleContext();
  const mode = drawPointMode(context);

  mode.start.call(lifecycleContext);
  t.equal(context.store.clearSelected.callCount, 1, 'store.clearSelected called');
  t.equal(context.ui.queueMapClasses.callCount, 1, 'ui.queueMapClasses called');
  t.deepEqual(context.ui.queueMapClasses.getCall(0).args, [{ mouse: 'add' }],
    'ui.queueMapClasses received correct arguments');
  t.equal(context.ui.setActiveButton.callCount, 1, 'ui.setActiveButton called');
  t.deepEqual(context.ui.setActiveButton.getCall(0).args, ['point'],
    'ui.setActiveButton received correct arguments');

  t.equal(lifecycleContext.on.callCount, 3, 'this.on called');
  t.ok(lifecycleContext.on.calledWith('click', CommonSelectors.true));
  t.ok(lifecycleContext.on.calledWith('keyup', CommonSelectors.isEscapeKey));
  t.ok(lifecycleContext.on.calledWith('keyup', CommonSelectors.isEnterKey));

  t.end();
});

test('draw_point stop with point placed', t => {
  const context = createMockContext();
  const mode = drawPointMode(context);

  // Fake a placed point
  context._test.point.updateCoordinate(10, 20);

  mode.stop.call();
  t.equal(context.ui.setActiveButton.callCount, 1, 'ui.setActiveButton called');
  t.deepEqual(context.ui.setActiveButton.getCall(0).args, [],
    'ui.setActiveButton received correct arguments');
  t.equal(context.store.delete.callCount, 0, 'store.delete not called');

  t.end();
});

test('draw_point stop with no point placed', t => {
  const context = createMockContext();
  const mode = drawPointMode(context);

  mode.stop.call();
  t.equal(context.ui.setActiveButton.callCount, 1, 'ui.setActiveButton called');
  t.deepEqual(context.ui.setActiveButton.getCall(0).args, [],
    'ui.setActiveButton received correct arguments');
  t.equal(context.store.delete.callCount, 1, 'store.delete called');
  t.deepEqual(context.store.delete.getCall(0).args, [
    [context._test.point.id],
    { silent: true }
  ], 'store.delete received correct arguments');

  t.end();
});

test('draw_point render, active', t => {
  const context = createMockContext();
  const mode = drawPointMode(context);

  const memo = [];
  const geojson = {
    type: 'Feature',
    properties: {
      id: context._test.point.id
    },
    geometry: {
      type: 'Point',
      coordinates: [10, 10]
    }
  };
  mode.render(geojson, x => memo.push(x));
  t.equal(memo.length, 0);
  t.end();
});

test('draw_point render, inactive', t => {
  const context = createMockContext();
  const mode = drawPointMode(context);

  const memo = [];
  const geojson = {
    type: 'Feature',
    properties: {
      meta: 'nothing'
    },
    geometry: {
      type: 'Point',
      coordinates: [10, 10]
    }
  };
  mode.render(geojson, x => memo.push(x));
  t.equal(memo.length, 1);
  t.deepEqual(memo[0], {
    type: 'Feature',
    properties: {
      active: 'false',
      meta: 'nothing'
    },
    geometry: {
      type: 'Point',
      coordinates: [10, 10]
    }
  });
  t.end();
});

mapboxgl.accessToken = accessToken;

test('draw_point interaction', t => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const map = createMap({ container });
  const Draw = GLDraw();
  map.addControl(Draw);

  map.on('load', () => {
    // The following sub-tests share state ...

    t.test('clicking', st => {
      Draw.deleteAll();
      Draw.changeMode('draw_point');
      click(map, makeMouseEvent(10, 20));

      const { features } = Draw.getAll();
      st.equal(features.length, 1, 'point created');
      const point = Draw.getAll().features[0];
      st.equal(point.geometry.type, 'Point');

      st.deepEqual(point.geometry.coordinates, [10, 20], 'coordinate added');

      click(map, makeMouseEvent(30, 30));
      st.equal(features.length, 1, 'mode has changed, so another click does not create another point');

      st.end();
    });

    t.test('exist before clicking by hitting Escape', st => {
      Draw.deleteAll();
      Draw.changeMode('draw_point');

      const escapeEvent = createSyntheticEvent('keyup', {
        keyCode: 27
      });
      container.dispatchEvent(escapeEvent);

      st.equal(Draw.getAll().features.length, 0, 'no feature added');
      click(map, makeMouseEvent(30, 30));
      st.equal(Draw.getAll().features.length, 0, 'mode has changed, so a click does not create another point');

      st.end();
    });

    t.test('exist before clicking by hitting Enter', st => {
      Draw.deleteAll();
      Draw.changeMode('draw_point');

      const enterEvent = createSyntheticEvent('keyup', {
        keyCode: 13
      });
      container.dispatchEvent(enterEvent);

      st.equal(Draw.getAll().features.length, 0, 'no feature added');
      click(map, makeMouseEvent(30, 30));
      st.equal(Draw.getAll().features.length, 0, 'mode has changed, so a click does not create another point');

      st.end();
    });

    t.test('exist before clicking with Trash', st => {
      Draw.deleteAll();
      Draw.changeMode('draw_point');

      Draw.trash();

      st.equal(Draw.getAll().features.length, 0, 'no feature added');
      click(map, makeMouseEvent(30, 30));
      st.equal(Draw.getAll().features.length, 0, 'mode has changed, so a click does not create another point');

      st.end();
    });

    document.body.removeChild(container);
    t.end();
  });
});
