import * as Constants from './constants.js';

import styles from './lib/theme.js';
import modes from './modes/index.js';

const defaultOptions = {
  defaultMode: Constants.modes.SIMPLE_SELECT,
  keybindings: true,
  touchEnabled: true,
  clickBuffer: 2,
  touchBuffer: 25,
  boxSelect: true,
  displayControlsDefault: true,
  styles,
  modes,
  controls: {},
  userProperties: false,
  suppressAPIEvents: true
};

const showControls = {
  point: true,
  line_string: true,
  polygon: true,
  trash: true,
  combine_features: true,
  uncombine_features: true
};

const hideControls = {
  point: false,
  line_string: false,
  polygon: false,
  trash: false,
  combine_features: false,
  uncombine_features: false
};

function addSource(styles) {
  return styles.map((style) => {
    if (style.source) return style;
    return Object.assign({}, style, {
      id: style.id,
      source: Constants.source
    });
  });
}

export default function(options = {}) {
  let withDefaults = Object.assign({}, options);

  if (!options.controls) {
    withDefaults.controls = {};
  }

  if (options.displayControlsDefault === false) {
    withDefaults.controls = Object.assign({}, hideControls, options.controls);
  } else {
    withDefaults.controls = Object.assign({}, showControls, options.controls);
  }

  withDefaults = Object.assign({}, defaultOptions, withDefaults);

  // Layers with a shared source should be adjacent for performance reasons
  withDefaults.styles = addSource(withDefaults.styles);

  return withDefaults;
}
