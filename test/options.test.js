/* eslint no-shadow:[0] */
import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'url';

import MapboxDraw from '../index.js';
import modes from '../src/modes/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const styleWithSourcesFixture = JSON.parse(fs.readFileSync(path.join(__dirname, './fixtures/style_with_sources.json')));

test('Options test', async (t) => {
  t.test('no options', () => {
    const Draw = new MapboxDraw();
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      touchEnabled: true,
      keybindings: true,
      clickBuffer: 2,
      touchBuffer: 25,
      displayControlsDefault: true,
      boxSelect: true,
      userProperties: false,
      styles: Draw.options.styles,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        trash: true,
        combine_features: true,
        uncombine_features: true
      },
      suppressAPIEvents: true
    };
    assert.deepEqual(defaultOptions, Draw.options);
    assert.deepEqual(styleWithSourcesFixture, Draw.options.styles);
  });

  await t.test('use custom clickBuffer', () => {
    const Draw = new MapboxDraw({ clickBuffer: 10 });
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      keybindings: true,
      touchEnabled: true,
      clickBuffer: 10,
      touchBuffer: 25,
      boxSelect: true,
      displayControlsDefault: true,
      styles: Draw.options.styles,
      userProperties: false,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        trash: true,
        combine_features: true,
        uncombine_features: true
      },
      suppressAPIEvents: true
    };

    assert.deepEqual(defaultOptions, Draw.options);
  });

  t.test('hide all controls', () => {
    const Draw = new MapboxDraw({displayControlsDefault: false});
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      keybindings: true,
      touchEnabled: true,
      clickBuffer: 2,
      touchBuffer: 25,
      boxSelect: true,
      displayControlsDefault: false,
      userProperties: false,
      styles: Draw.options.styles,
      controls: {
        point: false,
        line_string: false,
        polygon: false,
        trash: false,
        combine_features: false,
        uncombine_features: false
      },
      suppressAPIEvents: true
    };
    assert.deepEqual(defaultOptions, Draw.options);
  });

  await t.test('hide controls but show point', () => {
    const Draw = new MapboxDraw({displayControlsDefault: false, controls: {point:true}});
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      keybindings: true,
      touchEnabled: true,
      displayControlsDefault: false,
      clickBuffer: 2,
      touchBuffer: 25,
      boxSelect: true,
      userProperties: false,
      styles: Draw.options.styles,
      controls: {
        point: true,
        line_string: false,
        polygon: false,
        trash: false,
        combine_features: false,
        uncombine_features: false
      },
      suppressAPIEvents: true
    };

    assert.deepEqual(defaultOptions, Draw.options);
  });

  t.test('hide only point control', () => {
    const Draw = new MapboxDraw({ controls: {point:false}});
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      keybindings: true,
      touchEnabled: true,
      displayControlsDefault: true,
      touchBuffer: 25,
      clickBuffer: 2,
      userProperties: false,
      boxSelect: true,
      styles: Draw.options.styles,
      controls: {
        point: false,
        line_string: true,
        polygon: true,
        trash: true,
        combine_features: true,
        uncombine_features: true
      },
      suppressAPIEvents: true
    };

    assert.deepEqual(defaultOptions, Draw.options);
  });

  await t.test('disable touch interaction', () => {
    const Draw = new MapboxDraw({ touchEnabled: false });
    const defaultOptions = {
      defaultMode: 'simple_select',
      modes,
      touchEnabled: false,
      keybindings: true,
      clickBuffer: 2,
      touchBuffer: 25,
      displayControlsDefault: true,
      userProperties: false,
      boxSelect: true,
      styles: Draw.options.styles,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        trash: true,
        combine_features: true,
        uncombine_features: true
      },
      suppressAPIEvents: true
    };
    assert.deepEqual(defaultOptions, Draw.options);
    assert.deepEqual(styleWithSourcesFixture, Draw.options.styles);
  });

  await t.test('custom styles', () => {
    const Draw = new MapboxDraw({styles: [{
      'id': 'custom-polygon',
      'type': 'fill',
      'filter': ['all', ['==', '$type', 'Polygon']],
      'paint': {
        'fill-color': '#fff'
      }
    }, {
      'id': 'custom-point',
      'type': 'circle',
      'filter': ['all', ['==', '$type', 'Point']],
      'paint': {
        'circle-color': '#fff'
      }
    }]});

    const styles = [
      {
        'id': 'custom-polygon',
        'source': 'mapbox-gl-draw',
        'type': 'fill',
        'filter': ['all', ['==', '$type', 'Polygon']],
        'paint': {
          'fill-color': '#fff'
        }
      },
      {
        'id': 'custom-point',
        'source': 'mapbox-gl-draw',
        'type': 'circle',
        'filter': ['all', ['==', '$type', 'Point']],
        'paint': {
          'circle-color': '#fff'
        }
      }
    ];

    assert.deepEqual(styles, Draw.options.styles);
  });
});
