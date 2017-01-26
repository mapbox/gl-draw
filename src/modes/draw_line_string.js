const CommonSelectors = require('../lib/common_selectors');
const LineString = require('../feature_types/line_string');
const isEventAtCoordinates = require('../lib/is_event_at_coordinates');
const doubleClickZoom = require('../lib/double_click_zoom');
const Constants = require('../constants');
const createVertex = require('../lib/create_vertex');

module.exports = function(ctx) {
  const line = new LineString(ctx, {
    type: Constants.geojsonTypes.FEATURE,
    properties: {},
    geometry: {
      type: Constants.geojsonTypes.LINE_STRING,
      coordinates: []
    }
  });
  let currentVertexPosition = 0;

  if (ctx._test) ctx._test.line = line;

  ctx.store.add(line);

  return {
    start: function() {
      ctx.store.clearSelected();
      doubleClickZoom.disable(ctx);
      ctx.ui.queueMapClasses({ mouse: Constants.cursors.ADD });
      ctx.ui.setActiveButton(Constants.types.LINE);
      this.on('mousemove', CommonSelectors.true, (e) => {
        line.updateCoordinate(currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
        if (CommonSelectors.isVertex(e)) {
          ctx.ui.queueMapClasses({ mouse: Constants.cursors.POINTER });
        }
      });

      this.on('click', CommonSelectors.true, clickAnywhere);
      this.on('tap', CommonSelectors.true, clickAnywhere);
      this.on('click', CommonSelectors.isVertex, clickOnVertex);
      this.on('tap', CommonSelectors.isVertex, clickOnVertex);

      function clickAnywhere(e) {
        if (currentVertexPosition > 0 && isEventAtCoordinates(e, line.coordinates[currentVertexPosition - 1])) {
          return ctx.events.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [line.id] });
        }
        ctx.ui.queueMapClasses({ mouse: Constants.cursors.ADD });
        line.updateCoordinate(currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
        currentVertexPosition++;
      }

      function clickOnVertex() {
        return ctx.events.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [line.id] });
      }

      function stopDrawingAndRemove() {
        ctx.store.delete([line.id], { silent: true });
        ctx.events.changeMode(Constants.modes.SIMPLE_SELECT, {}, { silent: true });
      }

      this.on('keyup', CommonSelectors.isEscapeKey, () => {
        ctx.store.delete([line.id], { silent: true });
        ctx.events.changeMode(Constants.modes.SIMPLE_SELECT);
      });
      this.on('keyup', CommonSelectors.isEnterKey, () => {
        ctx.events.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [line.id] });
      });
      ctx.events.actionable({
        combineFeatures: false,
        uncombineFeatures: false,
        trash: true
      });
    },

    stop() {
      doubleClickZoom.enable(ctx);
      ctx.ui.setActiveButton();

      // check to see if we've deleted this feature
      if (ctx.store.get(line.id) === undefined) return;

      //remove last added coordinate
      line.removeCoordinate(`${currentVertexPosition}`);
      if (line.isValid()) {
        ctx.map.fire(Constants.events.CREATE, {
          features: [line.toGeoJSON()]
        });
      } else {
        stopDrawingAndRemove();
      }
    },

    render(geojson, callback) {
      const isActiveLine = geojson.properties.id === line.id;
      geojson.properties.active = (isActiveLine) ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE;
      if (!isActiveLine) return callback(geojson);

      // Only render the line if it has at least one real coordinate
      if (geojson.geometry.coordinates.length < 2) return;
      geojson.properties.meta = Constants.meta.FEATURE;

      if (geojson.geometry.coordinates.length >= 3) {
        callback(createVertex(line.id, geojson.geometry.coordinates[geojson.geometry.coordinates.length - 2], `${geojson.geometry.coordinates.length - 2}`, false));
      }

      callback(geojson);
    },

    trash() {
      if (currentVertexPosition > 2 ) {
        let cursorPosition = line.getCoordinate(`${currentVertexPosition}`);

        //a mousemove event has not happened so mimic one
        if (cursorPosition === undefined) {
          cursorPosition = line.getCoordinate(`${currentVertexPosition - 1}`);
          line.updateCoordinate(`${currentVertexPosition}`, cursorPosition[0], cursorPosition[1]);
        }
        //remove the last point
        currentVertexPosition--;
        line.removeCoordinate(`${currentVertexPosition}`);
      } else {
        stopDrawingAndRemove();
      }
    }
  };
};
