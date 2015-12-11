'use strict';

import R from 'ramda';
import API from './api';
import { DOM, createButton } from './util';

// GL Styles
import themeEdit from './theme/edit';
import themeStyle from './theme/style';
import themeDrawing from './theme/drawing';

// Data stores
import Store from './store';
import EditStore from './edit_store';

// Control handlers
import Line from './geometries/line';
import Point from './geometries/point';
import Square from './geometries/square';
import Polygon from './geometries/polygon';


/**
 * Draw plugin for Mapbox GL JS
 *
 * @param {Object} options
 * @param {Boolean} [options.drawing=true] - The ability to draw and delete features
 * @param {Boolean} [options.interactive=false] - Keep all features permanently in edit mode
 * @param {Boolean} [options.keybindings=true] - Keyboard shortcuts for drawing
 * @param {Object} [options.controls] - drawable shapes
 * @param {Boolean} [options.controls.marker=true]
 * @param {Boolean} [options.controls.line=true]
 * @param {Boolean} [options.controls.shape=true]
 * @param {Boolean} [options.controls.square=true]
 * @param {Object} [options.styles] - Mapbox GL JS style for draw features
 * @returns {Draw} this
 */
export default class Draw extends API {

  constructor(options) {
    super();

    this.options = {
      drawing: true,
      interactive: false,
      position: 'top-left',
      keybindings: true,
      styles: {},
      controls: {
        marker: true,
        line: true,
        shape: true,
        square: true
      }
    };

    Object.assign(this.options, options);

    // event listeners
    this.drag = this._drag.bind(this);
    this.onClick = this._onClick.bind(this);
    this.onKeyUp = this._onKeyUp.bind(this);
    this.endDrag = this._endDrag.bind(this);
    this.onKeyDown = this._onKeyDown.bind(this);
    this.onMouseUp = this._onMouseUp.bind(this);
    this.onMouseDown = this._onMouseDown.bind(this);
    this.initiateDrag = this._initiateDrag.bind(this);

  }

  /**
   * @private
   */
  onAdd(map) {
    var controlClass = this._controlClass = 'mapboxgl-ctrl-draw-btn';
    var container = this._container = DOM.create('div', 'mapboxgl-ctrl-group', map.getContainer());
    var controls = this.options.controls;
    this._store = new Store(map);
    this._editStore = new EditStore(map);
    this._store.setEditStore(this._editStore);
    this._editStore.setDrawStore(this._store);

    if (this.options.drawing) {
      // Build draw controls
      if (controls.line) {
        this.lineStringCtrl = createButton(this._container, {
          className: controlClass + ' line',
          title: `LineString tool ${this.options.keybindings && '(l)'}`,
          fn: this._drawLine.bind(this),
          id: 'lineDrawBtn'
        }, this._controlClass);
      }

      if (controls.shape) {
        this.polygonCtrl = createButton(this._container, {
          className: `${controlClass} shape`,
          title: `Polygon tool ${this.options.keybindings && '(p)'}`,
          fn: this._drawPolygon.bind(this),
          id: 'polygonDrawBtn'
        }, this._constrolClass);
      }

      if (controls.square) {
        this.squareCtrl = createButton(this._container, {
          className: `${controlClass} square`,
          title: `Square tool ${this.options.keybindings && '(s)'}`,
          fn: this._drawSquare.bind(this),
          id: 'squareDrawBtn'
        }, this._controlClass);
      }

      if (controls.marker) {
        this.markerCtrl = createButton(this._container, {
          className: `${controlClass} marker`,
          title: `Marker tool ${this.options.keybindings && '(m)'}`,
          fn: this._drawPoint.bind(this),
          id: 'pointDrawBtn'
        }, this._controlClass);
      }

      if (this.options.keybindings) {
        map.getContainer().addEventListener('keyup', this.onKeyUp);
      }

      map.getContainer().addEventListener('keydown', this.onKeyDown);
    }

    this._map = map;

    this._mapState();
    return container;
  }

  /**
   * @private
   */
  _onKeyDown(e) {
    const SHIFT_KEY = 16;
    if (e.keyCode === SHIFT_KEY) {
      this.shiftDown = true;
    }
  }

  /**
   * @private
   */
  _onMouseDown(e) {
    if (this.shiftDown) {
      this._featsInStart = DOM.mousePos(e, this._map.getContainer());
      this._map.getContainer().addEventListener('mouseup', this.onMouseUp);
    }
  }

  /**
   * @private
   */
  _onMouseUp(e) {
    if (this.shiftDown) {
      this._map.getContainer().removeEventListener('mouseup', this.onMouseUp);

      var end = DOM.mousePos(e, this._map.getContainer());

      this._map.getContainer().addEventListener('mousedown', this.initiateDrag, true);

      if (!this._editStore.inProgress())
        this.deleteBtn = createButton(this._container, {
          className: 'mapboxgl-ctrl-draw-btn trash',
          title: 'delete',
          fn: this._destroy.bind(this),
          id: 'deleteBtn'
        }, this._controlClass);

      this._store.editFeaturesIn(this._featsInStart, end);
    }
  }

  /**
   * @private
   */
  _onKeyUp(e) {
    if (!this.drawing) return;

    // draw shortcuts
    const ENTER = 13;          // (enter)
    const SHIFT_KEY = 16;      // (shift)
    const SQUARE_KEY = 83;     // (s)
    const DELETE_KEY = 68;     // (d)
    const MARKER_KEY = 77;     // (m)
    const POLYGON_KEY = 80;    // (p)
    const EXIT_EDIT_KEY = 27;  // (esc)
    const LINESTRING_KEY = 76; // (l)

    var event = document.createEvent('HTMLEvents');
    event.initEvent('click', true, false);

    if (!this._drawing) {
      switch (e.keyCode) {
        case LINESTRING_KEY:
          this.lineStringCtrl.dispatchEvent(event);
          break;
        case MARKER_KEY:
          this.markerCtrl.dispatchEvent(event);
          break;
        case POLYGON_KEY:
          this.polygonCtrl.dispatchEvent(event);
          break;
        case SQUARE_KEY:
          this.squareCtrl.dispatchEvent(event);
          break;
        case EXIT_EDIT_KEY:
        case ENTER:
          this._finishEdit();
          break;
      }
    }
    if (e.keyCode === DELETE_KEY) {
      if (this._editStore.inProgress()) {
        this._destroy();
      }
    }
    if (e.keyCode === SHIFT_KEY) {
      this.shiftDown = false;
    }
  }

  /**
   * Handles clicks on the maps in a number of scenarios
   * @param {Object} e - the object passed to the callback of map.on('click', ...)
   * @private
   */
  _onClick(e) {
    this._map.featuresAt(e.point, {
      radius: 10,
      includeGeometry: true,
      layer: [ 'gl-draw-polygon',
               'gl-draw-line',
               'gl-draw-point' ]
    }, (err, features) => {
      if (err) throw err;
      if (features.length) { // clicked on a feature
        if (this._drawing) return;
        // check if the object is permanent
        var id = features[0].properties.drawId;
        if (!this._store.get(id).getOptions().permanent)
          this._edit(id);
      } else { // clicked outside all features
        if (!this.options.interactive)
          this._finishEdit();
      }
    });
  }

  /**
   * @private
   */
  _edit(drawId) {
    this._map.getContainer().addEventListener('mousedown', this.initiateDrag, true);

    if (!this._editStore.inProgress() && this.options.drawing)
      this.deleteBtn = createButton(this._container, {
        className: 'mapboxgl-ctrl-draw-btn trash',
        title: 'delete',
        fn: this._destroy.bind(this),
        id: 'deleteBtn'
      }, this._controlClass);

    this._store.edit(drawId);
  }

  /**
   * @private
   */
  _finishEdit() {
    if (this._editStore.inProgress()) {
      this._editStore.finish();
      if (this.options.drawing) {
        this.deleteBtn.parentElement.removeChild(this.deleteBtn);
      }
      this._map.getContainer().removeEventListener('mousedown', this.initiateDrag, true);
    }
  }

  /**
   * @private
   */
  _initiateDrag(e) {
    var coords = DOM.mousePos(e, this._map._container);

    this._map.featuresAt([coords.x, coords.y], { radius: 20, includeGeometry: true }, (err, features) => {

      if (err)
        throw err;
      else if (!features.length)
        return;
      else if (R.none(feat => R.contains(feat.properties.drawId, this._editStore.getDrawIds()))(features))
        return;

      e.stopPropagation();

      if (features.length > 1) {
        this.vertex = R.find(feat => feat.properties.meta === 'vertex')(features);
        this.newVertex = R.find(feat => feat.properties.meta === 'midpoint')(features);
      }
      this.activeDrawId = R.find(feat => feat.properties.drawId)(features).properties.drawId;

      if (this.newVertex) {
        this._editStore.get(this.newVertex.properties.parent)
          .editAddVertex(coords, this.newVertex.properties.index);
        this.vertex = this.newVertex;
      }

      this._map.getContainer().addEventListener('mousemove', this.drag, true);
      this._map.getContainer().addEventListener('mouseup', this.endDrag, true);

    });
  }

  /**
   * @private
   */
  _drag(e) {
    e.stopPropagation();

    if (!this.dragging) {
      this.dragging = true;
      this.init = DOM.mousePos(e, this._map.getContainer());
      this._map.getContainer().classList.add('mapboxgl-draw-move-activated');
    }

    var curr = DOM.mousePos(e, this._map.getContainer());

    if (this.vertex) {
      this._editStore.get(this.vertex.properties.parent)
        .moveVertex(this.init, curr, this.vertex.properties.index);
    } else {
      this._editStore.get(this.activeDrawId).translate(this.init, curr);
    }
  }

  /**
   * @private
   */
  _endDrag() {
    this._map.getContainer().removeEventListener('mousemove', this.drag, true);
    this._map.getContainer().removeEventListener('mouseup', this.endDrag, true);
    this._map.getContainer().classList.remove('mapboxgl-draw-move-activated');

    if (!this.dragging) return;

    this._editStore.get(this.activeDrawId).translating = false;
    this.dragging = false;

    if (this.vertex) {
      this._editStore.get(this.vertex.properties.parent).movingVertex = false;
      this.vertex = false;
    }
  }

  /**
   * @private
   */
  _destroy() {
    this._editStore.clear();
    this.deleteBtn.parentNode.removeChild(this.deleteBtn);
    this._map.getContainer().removeEventListener('mousedown', this.initiateDrag, true);
  }

  /**
   * @private
   */
  _drawPolygon() {
    if (!this.options.interactive)
      this._finishEdit();
    var polygon = new Polygon({ map: this._map });
    polygon.startDraw();
    this._drawing = true;
  }

  /**
   * @private
   */
  _drawLine() {
    if (!this.options.interactive)
      this._finishEdit();
    var line = new Line({ map: this._map });
    line.startDraw();
    this._drawing = true;
  }

  /**
   * @private
   */
  _drawSquare() {
    if (!this.options.interactive)
      this._finishEdit();
    var square = new Square({ map: this._map });
    square.startDraw();
    this._drawing = true;
  }

  /**
   * @private
   */
  _drawPoint() {
    if (!this.options.interactive)
      this._finishEdit();
    var point = new Point({ map: this._map });
    point.startDraw();
    this._drawing = true;
  }

  /**
   * @private
   */
  _mapState() {
    this._map.on('load', () => {

      // in progress drawing style
      this._map.addSource('drawing', {
        data: {
          type: 'FeatureCollection',
          features: []
        },
        type: 'geojson'
      });
      themeDrawing.forEach(style => {
        Object.assign(style, this.options.styles[style.id] || {});
        this._map.addLayer(style);
      });

      // drawn features style
      this._map.addSource('draw', {
        data: this._store.getAllGeoJSON(),
        type: 'geojson'
      });
      themeStyle.forEach(style => {
        Object.assign(style, this.options.styles[style.id] || {});
        this._map.addLayer(style);
      });

      // features being editted style
      this._map.addSource('edit', {
        data: {
          type: 'FeatureCollection',
          features: []
        },
        type: 'geojson'
      });
      themeEdit.forEach(style => {
        Object.assign(style, this.options.styles[style.id] || {});
        this._map.addLayer(style);
      });

      this._map.on('drawing.new.update', e => {
        this._map.getSource('drawing').setData(e.geojson);
      });

      // clear the drawing layer after a drawing is done
      this._map.on('drawing.end', e => {
        this._map.getSource('drawing').setData({
          type: 'FeatureCollection',
          features: []
        });
        this._drawing = false;
        this._edit(e.geometry.getDrawId());
        [ this.lineStringCtrl,
          this.polygonCtrl,
          this.squareCtrl,
          this.markerCtrl ].forEach(ctrl => { if (ctrl) ctrl.classList.remove('active'); });
      });

      this._map.on('edit.feature.update', e => {
        this._map.getSource('edit').setData(e.geojson);
      });

      this._map.on('draw.feature.update', e => {
        this._map.getSource('draw').setData(e.geojson);
      });

      this._map.on('click', this.onClick);

      this._map.on('mousemove', e => {
        this._map.featuresAt(e.point, {
          radius: 7,
          layer: [ 'gl-edit-point', 'gl-edit-point-mid' ],
          includeGeometry: true
        }, (err, features) => {
          if (err) throw err;
          if (!features.length)
            return this._map.getContainer().classList.remove('mapboxgl-draw-move-activated');

          var vertex = R.find(feat => feat.properties.meta === 'vertex')(features);
          var midpoint = R.find(feat => feat.properties.meta === 'midpoint')(features);
          var marker = R.find(feat => feat.geometry.type === 'Point')(features);

          if (vertex || midpoint || marker) {
            this._map.getContainer().classList.add('mapboxgl-draw-move-activated');
            this.hoveringOnVertex = true;
          }
        });
      });

      this._map.on('drawing.cancel', e => {
        this._store.unset(e.drawId);
      });

      this._map.getContainer().addEventListener('mousedown', this.onMouseDown);
    });

  }

}
