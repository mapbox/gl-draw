'use strict';

import Polygon from './polygon';
import { DOM } from '../util';

/**
 * Square geometry class
 *
 * @param {Object} options
 * @param {Map} options.map - Instance of MapboxGL Map
 * @returns {Square} this
 */
export default class Square extends Polygon {

  constructor(options) {
    options.data = {
      geometry: {
        coordinates: [[[0, 0],[0, 0], [0, 0], [0, 0], [0, 0]]]
      }
    };
    options.type = 'Polygon';
    super(options);

    // event handlers
    this.onMouseDown = this._onMouseDown.bind(this);
    this.onMouseDrag = this._onMouseDrag.bind(this);
    this.onMouseUp = this.onStopDrawing;
  }

  _onMouseDown(e) {
    this.ready = true;
    var pos = DOM.mousePos(e, this._map.getContainer());
    this.initPos = pos;
    var c = this._map.unproject([pos.x, pos.y]);
    var p = [ c.lng, c.lat ];
    this.coordinates = [[ p, p, p, p, p ]];
  }

  _onMouseDrag(e) {
    if (this.initPos) {
      if (!this.started) {
        this.started = true;
      }

      var pos = DOM.mousePos(e.originalEvent, this._map._container);
      var c = this._map.unproject([pos.x, pos.y]);
      var ne = this._map.unproject([this.initPos.x, pos.y]);
      var sw = this._map.unproject([pos.x, this.initPos.y]);
      this.coordinates[0][1] = [ ne.lng, ne.lat ];
      this.coordinates[0][2] = [ c.lng, c.lat ];
      this.coordinates[0][3] = [ sw.lng, sw.lat ];
    }
  }

}
