import * as Constants from './constants.js';

export default function render() {
  // eslint-disable-next-line no-invalid-this
  const store = this;
  const mapExists = store.ctx.map && store.ctx.map.getSource(Constants.source) !== undefined;
  if (!mapExists) return cleanup();

  const mode = store.ctx.events.currentModeName();

  store.ctx.ui.queueMapClasses({ mode });

  const newIds = store.getAllIds();

  const lastCount = store.source.length;
  store.source = [];

  const changed = lastCount !== store.source.length || newIds.length > 0;
  newIds.forEach(id => renderFeature(id));

  function renderFeature(id) {
    const feature = store.get(id);
    const featureInternal = feature.internal(mode);
    store.ctx.events.currentModeRender(featureInternal, (geojson) => {
      geojson.properties.mode = mode;
      store.source.push(geojson);
    });
  }

  if (changed) {
    store.ctx.map.getSource(Constants.source).setData({
      type: Constants.geojsonTypes.FEATURE_COLLECTION,
      features: store.source
    });
  }

  cleanup();

  function cleanup() {
    store.isDirty = false;
    store.clearChangedIds();
  }
}
