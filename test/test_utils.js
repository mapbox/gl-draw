import mapboxgl from 'mapbox-gl-js-mock';
import hat from 'hat';
import spy from 'sinon/lib/sinon/spy'; // avoid babel-register-related error by importing only spy

const hatRack = hat.rack();

export function createMap(mapOptions = {}) {

  var map = new mapboxgl.Map(Object.assign({
    container: document.createElement('div'),
    style: 'mapbox://styles/mapbox/streets-v8'
  }, mapOptions));
  // Some mock project/unproject functions
  map.project = ([y, x]) => ({ x, y });
  map.unproject = ([x, y]) => ({ lng: y, lat: x });
  if (mapOptions.container) {
    map.getContainer = () => mapOptions.container;
  }

  var classList = [];
  var container = map.getContainer();
  container.classList.add = function(names) {
    names = names || '';
    names.split(' ').forEach(name => {
      if (classList.indexOf(name) === -1) {
        classList.push(name);
      }
    });
    container.className = classList.join(' ');
  }

  container.classList.remove = function(names) {
    names = names || '';
    names.split(' ').forEach(name => {
      classList = classList.filter(n => n !== name);
    });
    container.className = classList.join(' ');
  }

  container.className = classList.join(' ');

  container.clientLeft = 0;
  container.clientTop = 0;
  container.getBoundingClientRect = function() {
    return {
      left: 0,
      top: 0
    };
  }

  map.getContainer = function() {
    return container;
  }

  return map;
}

export function click(map, payload) {
  map.fire('mousedown', payload);
  map.fire('mouseup', payload);
}

const features = {
  multiPolygon: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: [[[[1,1],[2,2],[2,6],[4,3],[1,1]]]]
    }
  },

  line: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [[0, 0], [1, 1], [2, 2]]
    }
  },

  multiLineString: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiLineString',
      coordinates: [[[20, 20], [21, 21], [22, 22]], [[30, 30], [31, 31], [32, 32]]]
    }
  },

  multiPoint: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPoint',
      coordinates: [[-5, -5], [-10, -10]]
    }
  },

  point: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [10, 10]
    }
  },

  negitivePoint: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [-10, -10]
    }
  },

  polygon: {
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[30, 20],[50, 40],[70, 30],[50, 20],[30, 20]]]
    }
  },

  square: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[1, 1], [1, 2], [2, 2], [2, 1], [1, 1]]]
    }
  },

  featureCollection: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[[1, 1], [2, 2], [3, 3], [4, 4], [1, 1]]]
        }
      }
    ]
  }

};

export function cloneFeature (type) {
  return JSON.parse(JSON.stringify(features[type]));
}

export function createFeature(featureType) {
  const feature = Object.assign({
    id: hatRack()
  }, cloneFeature(featureType));
  feature.toGeoJSON = () => feature;
  return feature;
}

/**
 * Returns an array of an object's own property keys that are
 * not prefixed with `_`, indicating pseudo-privacy.
 *
 * @param {Object} instance
 * @return {Array<string>} Public members
 */
export function getPublicMemberKeys(instance) {
  return Object.keys(instance).filter(k => k[0] !== '_');
}

/**
 * Returns an mock ctx object with just those properties a Feature
 * requires.
 *
 * @return {Object}
 */
export function createMockCtx() {
  return {
    store: {
      featureChanged: spy()
    }
  };
}

/**
 * Draws a feature on a map.
 */
const mapFeaturesToModes = {
  Polygon: 'draw_polygon',
  Point: 'draw_point',
  LineString: 'draw_line_string'
};

export function drawGeometry(map, draw, type, coordinates) {
  draw.changeMode(mapFeaturesToModes[type]);
  let drawCoordinates;
  if (type === 'Polygon') drawCoordinates = coordinates[0];
  if (type === 'Point') drawCoordinates = [coordinates];
  if (type === 'LineString') drawCoordinates = coordinates;
  drawCoordinates.forEach(point => {
    click(map, {
      lngLat: {
        lng: point[0],
        lat: point[1]
      },
      point: { x: 0, y: 0 }
    });
  });
  draw.changeMode('simple_select');
}
