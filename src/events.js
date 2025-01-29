import setupModeHandler from './lib/mode_handler.js';
import getFeaturesAndSetCursor from './lib/get_features_and_set_cursor.js';
import featuresAt from './lib/features_at.js';
import isClick from './lib/is_click.js';
import isTap from './lib/is_tap.js';
import * as Constants from './constants.js';
import objectToMode from './modes/object_to_mode.js';

export default function(ctx) {

  const modes = Object.keys(ctx.options.modes).reduce((m, k) => {
    m[k] = objectToMode(ctx.options.modes[k]);
    return m;
  }, {});

  let mouseDownInfo = {};
  let touchStartInfo = {};
  const events = {};
  let currentModeName = null;
  let currentMode = null;

  events.drag = function(event, isDrag) {
    if (isDrag({
      point: event.point,
      time: new Date().getTime()
    })) {
      ctx.ui.queueMapClasses({ mouse: Constants.cursors.DRAG });
      currentMode.drag(event);
    } else {
      event.originalEvent.stopPropagation();
    }
  };

  events.mousedrag = function(event) {
    events.drag(event, endInfo => !isClick(mouseDownInfo, endInfo));
  };

  events.touchdrag = function(event) {
    events.drag(event, endInfo => !isTap(touchStartInfo, endInfo));
  };

  events.mousemove = function(event) {
    const button = event.originalEvent.buttons !== undefined ? event.originalEvent.buttons : event.originalEvent.which;
    if (button === 1) {
      return events.mousedrag(event);
    }
    const target = getFeaturesAndSetCursor(event, ctx);
    event.featureTarget = target;
    currentMode.mousemove(event);
  };

  events.mousedown = function(event) {
    mouseDownInfo = {
      time: new Date().getTime(),
      point: event.point
    };
    const target = getFeaturesAndSetCursor(event, ctx);
    event.featureTarget = target;
    currentMode.mousedown(event);
  };

  events.mouseup = function(event) {
    const target = getFeaturesAndSetCursor(event, ctx);
    event.featureTarget = target;

    if (isClick(mouseDownInfo, {
      point: event.point,
      time: new Date().getTime()
    })) {
      currentMode.click(event);
    } else {
      currentMode.mouseup(event);
    }
  };

  events.mouseout = function(event) {
    currentMode.mouseout(event);
  };

  events.touchstart = function(event) {
    if (!ctx.options.touchEnabled) {
      return;
    }

    touchStartInfo = {
      time: new Date().getTime(),
      point: event.point
    };
    const target = featuresAt.touch(event, null, ctx)[0];
    event.featureTarget = target;
    currentMode.touchstart(event);
  };

  events.touchmove = function(event) {
    if (!ctx.options.touchEnabled) {
      return;
    }

    currentMode.touchmove(event);

    if (event.points.length === 1) {
      events.touchdrag(event);
    }
  };

  events.touchend = function(event) {
    // Prevent emulated mouse events because we will fully handle the touch here.
    // This does not stop the touch events from propogating to mapbox though.
    event.originalEvent.preventDefault();
    if (!ctx.options.touchEnabled) {
      return;
    }

    const target = featuresAt.touch(event, null, ctx)[0];
    event.featureTarget = target;
    if (isTap(touchStartInfo, {
      time: new Date().getTime(),
      point: event.point
    })) {
      currentMode.tap(event);
    } else {
      currentMode.touchend(event);
    }
  };

  // 8 - Backspace
  // 46 - Delete
  const isKeyModeValid = code => !(code === 8 || code === 46 || (code >= 48 && code <= 57));

  events.keydown = function(event) {
    const isMapElement = (event.srcElement || event.target).classList.contains(Constants.classes.CANVAS);
    if (!isMapElement) return; // we only handle events on the map

    if ((event.keyCode === 8 || event.keyCode === 46) && ctx.options.controls.trash) {
      event.preventDefault();
      currentMode.trash();
    } else if (isKeyModeValid(event.keyCode)) {
      currentMode.keydown(event);
    } else if (event.keyCode === 49 && ctx.options.controls.point) {
      changeMode(Constants.modes.DRAW_POINT);
    } else if (event.keyCode === 50 && ctx.options.controls.line_string) {
      changeMode(Constants.modes.DRAW_LINE_STRING);
    } else if (event.keyCode === 51 && ctx.options.controls.polygon) {
      changeMode(Constants.modes.DRAW_POLYGON);
    }
  };

  events.keyup = function(event) {
    if (isKeyModeValid(event.keyCode)) {
      currentMode.keyup(event);
    }
  };

  events.zoomend = function() {
    ctx.store.changeZoom();
  };

  events.data = function(event) {
    if (event.dataType === 'style') {
      const { setup, map, options, store } = ctx;
      const hasLayers = options.styles.some(style => map.getLayer(style.id));
      if (!hasLayers) {
        setup.addLayers();
        store.setDirty();
        store.render();
      }
    }
  };

  function changeMode(modename, nextModeOptions, eventOptions = {}) {
    currentMode.stop();

    const modebuilder = modes[modename];
    if (modebuilder === undefined) {
      throw new Error(`${modename} is not valid`);
    }
    currentModeName = modename;
    const mode = modebuilder(ctx, nextModeOptions);
    currentMode = setupModeHandler(mode, ctx);

    if (!eventOptions.silent) {
      ctx.map.fire(Constants.events.MODE_CHANGE, { mode: modename});
    }

    ctx.store.setDirty();
    ctx.store.render();
  }

  const actionState = {
    trash: false,
    combineFeatures: false,
    uncombineFeatures: false
  };

  function actionable(actions) {
    let changed = false;
    Object.keys(actions).forEach((action) => {
      if (actionState[action] === undefined) throw new Error('Invalid action type');
      if (actionState[action] !== actions[action]) changed = true;
      actionState[action] = actions[action];
    });
    if (changed) ctx.map.fire(Constants.events.ACTIONABLE, { actions: actionState });
  }

  const api = {
    start() {
      currentModeName = ctx.options.defaultMode;
      currentMode = setupModeHandler(modes[currentModeName](ctx), ctx);
    },
    changeMode,
    actionable,
    currentModeName() {
      return currentModeName;
    },
    currentModeRender(geojson, push) {
      return currentMode.render(geojson, push);
    },
    fire(eventName, eventData) {
      if (!ctx.map) return;
      ctx.map.fire(eventName, eventData);
    },
    addEventListeners() {
      ctx.map.on('mousemove', events.mousemove);
      ctx.map.on('mousedown', events.mousedown);
      ctx.map.on('mouseup', events.mouseup);
      ctx.map.on('data', events.data);

      ctx.map.on('touchmove', events.touchmove);
      ctx.map.on('touchstart', events.touchstart);
      ctx.map.on('touchend', events.touchend);

      ctx.container.addEventListener('mouseout', events.mouseout);

      if (ctx.options.keybindings) {
        ctx.container.addEventListener('keydown', events.keydown);
        ctx.container.addEventListener('keyup', events.keyup);
      }
    },
    removeEventListeners() {
      ctx.map.off('mousemove', events.mousemove);
      ctx.map.off('mousedown', events.mousedown);
      ctx.map.off('mouseup', events.mouseup);
      ctx.map.off('data', events.data);

      ctx.map.off('touchmove', events.touchmove);
      ctx.map.off('touchstart', events.touchstart);
      ctx.map.off('touchend', events.touchend);

      ctx.container.removeEventListener('mouseout', events.mouseout);

      if (ctx.options.keybindings) {
        ctx.container.removeEventListener('keydown', events.keydown);
        ctx.container.removeEventListener('keyup', events.keyup);
      }
    },
    trash(options) {
      currentMode.trash(options);
    },
    combineFeatures() {
      currentMode.combineFeatures();
    },
    uncombineFeatures() {
      currentMode.uncombineFeatures();
    },
    getMode() {
      return currentModeName;
    }
  };

  return api;
}
