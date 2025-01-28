import toDenseArray from './lib/to_dense_array.js';
import StringSet from './lib/string_set.js';
import render from './render.js';
import * as Constants from './constants.js';

export default function Store(ctx) {
  this._features = {};
  this._featureIds = new StringSet();
  this._selectedFeatureIds = new StringSet();
  this._selectedCoordinates = [];
  this._changedFeatureIds = new StringSet();
  this._emitSelectionChange = false;
  this._mapInitialConfig = {};
  this.ctx = ctx;
  this.source = [];

  // Deduplicate requests to render and tie them to animation frames.
  let renderRequest;
  this.render = () => {
    if (!renderRequest) {
      renderRequest = requestAnimationFrame(() => {
        renderRequest = null;
        render.call(this);

        // Fire deduplicated selection change event
        if (this._emitSelectionChange) {
          this.ctx.events.fire(Constants.events.SELECTION_CHANGE, {
            features: this.getSelected().map(feature => feature.toGeoJSON()),
            points: this.getSelectedCoordinates().map(coordinate => ({
              type: Constants.geojsonTypes.FEATURE,
              properties: {},
              geometry: {
                type: Constants.geojsonTypes.POINT,
                coordinates: coordinate.coordinates
              }
            }))
          });

          this._emitSelectionChange = false;
        }

        // Fire render event
        this.ctx.events.fire(Constants.events.RENDER, {});
      });
    }
  };

  this.isDirty = false;
}

/**
 * Delays all rendering until the returned function is invoked
 * @return {Function} renderBatch
 */
Store.prototype.createRenderBatch = function() {
  const holdRender = this.render;
  let numRenders = 0;
  this.render = function() {
    numRenders++;
  };

  return () => {
    this.render = holdRender;
    if (numRenders > 0) {
      this.render();
    }
  };
};

/**
 * Sets the store's state to dirty.
 * @return {Store} this
 */
Store.prototype.setDirty = function() {
  this.isDirty = true;
  return this;
};

/**
 * Sets a feature's state to changed.
 * @param {string} featureId
 * @return {Store} this
 */
Store.prototype.featureCreated = function(featureId, options = {}) {
  this._changedFeatureIds.add(featureId);

  const silent = options.silent != null ? options.silent : this.ctx.options.suppressAPIEvents;
  if (silent !== true) {
    const feature = this.get(featureId);
    this.ctx.events.fire(Constants.events.CREATE, {
      features: [feature.toGeoJSON()]
    });
  }

  return this;
};

/**
 * Sets a feature's state to changed.
 * @param {string} featureId
 * @return {Store} this
 */
Store.prototype.featureChanged = function(featureId, options = {}) {
  this._changedFeatureIds.add(featureId);

  const silent = options.silent != null ? options.silent : this.ctx.options.suppressAPIEvents;
  if (silent !== true) {
    this.ctx.events.fire(Constants.events.UPDATE, {
      action: options.action ? options.action : Constants.updateActions.CHANGE_COORDINATES,
      features: [this.get(featureId).toGeoJSON()]
    });
  }

  return this;
};

/**
 * Gets the ids of all features currently in changed state.
 * @return {Store} this
 */
Store.prototype.getChangedIds = function() {
  return this._changedFeatureIds.values();
};

/**
 * Sets all features to unchanged state.
 * @return {Store} this
 */
Store.prototype.clearChangedIds = function() {
  this._changedFeatureIds.clear();
  return this;
};

/**
 * Gets the ids of all features in the store.
 * @return {Store} this
 */
Store.prototype.getAllIds = function() {
  return this._featureIds.values();
};

/**
 * Adds a feature to the store.
 * @param {Object} feature
 * @param {Object} [options]
 * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
 *
 * @return {Store} this
 */
Store.prototype.add = function(feature, options = {}) {
  this._features[feature.id] = feature;
  this._featureIds.add(feature.id);
  this.featureCreated(feature.id, {silent: options.silent});
  return this;
};

/**
 * Deletes a feature or array of features from the store.
 * Cleans up after the deletion by deselecting the features.
 * If changes were made, sets the state to the dirty
 * and fires an event.
 * @param {string | Array<string>} featureIds
 * @param {Object} [options]
 * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
 * @return {Store} this
 */
Store.prototype.delete = function(featureIds, options = {}) {
  const deletedFeaturesToEmit = [];
  toDenseArray(featureIds).forEach((id) => {
    if (!this._featureIds.has(id)) return;
    this._featureIds.delete(id);
    this._selectedFeatureIds.delete(id);
    if (!options.silent) {
      if (deletedFeaturesToEmit.indexOf(this._features[id]) === -1) {
        deletedFeaturesToEmit.push(this._features[id].toGeoJSON());
      }
    }
    delete this._features[id];
    this.isDirty = true;
  });

  if (deletedFeaturesToEmit.length) {
    this.ctx.events.fire(Constants.events.DELETE, {features: deletedFeaturesToEmit});
  }

  refreshSelectedCoordinates(this, options);
  return this;
};

/**
 * Returns a feature in the store matching the specified value.
 * @return {Object | undefined} feature
 */
Store.prototype.get = function(id) {
  return this._features[id];
};

/**
 * Returns all features in the store.
 * @return {Array<Object>}
 */
Store.prototype.getAll = function() {
  return Object.keys(this._features).map(id => this._features[id]);
};

/**
 * Adds features to the current selection.
 * @param {string | Array<string>} featureIds
 * @param {Object} [options]
 * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
 * @return {Store} this
 */
Store.prototype.select = function(featureIds, options = {}) {
  toDenseArray(featureIds).forEach((id) => {
    if (this._selectedFeatureIds.has(id)) return;
    this._selectedFeatureIds.add(id);
    this._changedFeatureIds.add(id);
    if (!options.silent) {
      this._emitSelectionChange = true;
    }
  });
  return this;
};

/**
 * Deletes features from the current selection.
 * @param {string | Array<string>} featureIds
 * @param {Object} [options]
 * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
 * @return {Store} this
 */
Store.prototype.deselect = function(featureIds, options = {}) {
  toDenseArray(featureIds).forEach((id) => {
    if (!this._selectedFeatureIds.has(id)) return;
    this._selectedFeatureIds.delete(id);
    this._changedFeatureIds.add(id);
    if (!options.silent) {
      this._emitSelectionChange = true;
    }
  });
  refreshSelectedCoordinates(this, options);
  return this;
};

/**
 * Clears the current selection.
 * @param {Object} [options]
 * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
 * @return {Store} this
 */
Store.prototype.clearSelected = function(options = {}) {
  this.deselect(this._selectedFeatureIds.values(), { silent: options.silent });
  return this;
};

/**
 * Sets the store's selection, clearing any prior values.
 * If no feature ids are passed, the store is just cleared.
 * @param {string | Array<string> | undefined} featureIds
 * @param {Object} [options]
 * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
 * @return {Store} this
 */
Store.prototype.setSelected = function(featureIds, options = {}) {
  featureIds = toDenseArray(featureIds);

  // Deselect any features not in the new selection
  this.deselect(this._selectedFeatureIds.values().filter(id => featureIds.indexOf(id) === -1), { silent: options.silent });

  // Select any features in the new selection that were not already selected
  this.select(featureIds.filter(id => !this._selectedFeatureIds.has(id)), { silent: options.silent });

  return this;
};

/**
 * Sets the store's coordinates selection, clearing any prior values.
 * @param {Array<Array<string>>} coordinates
 * @return {Store} this
 */
Store.prototype.setSelectedCoordinates = function(coordinates) {
  this._selectedCoordinates = coordinates;
  this._emitSelectionChange = true;
  return this;
};

/**
 * Clears the current coordinates selection.
 * @param {Object} [options]
 * @return {Store} this
 */
Store.prototype.clearSelectedCoordinates = function() {
  this._selectedCoordinates = [];
  this._emitSelectionChange = true;
  return this;
};

/**
 * Returns the ids of features in the current selection.
 * @return {Array<string>} Selected feature ids.
 */
Store.prototype.getSelectedIds = function() {
  return this._selectedFeatureIds.values();
};

/**
 * Returns features in the current selection.
 * @return {Array<Object>} Selected features.
 */
Store.prototype.getSelected = function() {
  return this.getSelectedIds().map(id => this.get(id));
};

/**
 * Returns selected coordinates in the currently selected feature.
 * @return {Array<Object>} Selected coordinates.
 */
Store.prototype.getSelectedCoordinates = function() {
  const selected = this._selectedCoordinates.map((coordinate) => {
    const feature = this.get(coordinate.feature_id);
    return {
      coordinates: feature.getCoordinate(coordinate.coord_path)
    };
  });
  return selected;
};

/**
 * Indicates whether a feature is selected.
 * @param {string} featureId
 * @return {boolean} `true` if the feature is selected, `false` if not.
 */
Store.prototype.isSelected = function(featureId) {
  return this._selectedFeatureIds.has(featureId);
};

/**
 * Sets a property on the given feature
 * @param {string} featureId
 * @param {string} property property
 * @param {string} property value
 * @param {Object} [options]
 * @param {Object} [options.silent] - If `true`, this invocation will not fire an event.
*/
Store.prototype.setFeatureProperty = function(featureId, property, value, options = {}) {
  this.get(featureId).setProperty(property, value);

  this.featureChanged(featureId, {
    silent: options.silent,
    action: Constants.updateActions.CHANGE_PROPERTIES
  });
};

function refreshSelectedCoordinates(store, options = {}) {
  const newSelectedCoordinates = store._selectedCoordinates.filter(point => store._selectedFeatureIds.has(point.feature_id));
  if (store._selectedCoordinates.length !== newSelectedCoordinates.length && !options.silent) {
    store._emitSelectionChange = true;
  }
  store._selectedCoordinates = newSelectedCoordinates;
}

/**
 * Stores the initial config for a map, so that we can set it again after we're done.
*/
Store.prototype.storeMapConfig = function() {
  Constants.interactions.forEach((interaction) => {
    const interactionSet = this.ctx.map[interaction];
    if (interactionSet) {
      this._mapInitialConfig[interaction] = this.ctx.map[interaction].isEnabled();
    }
  });
};

/**
 * Restores the initial config for a map, ensuring all is well.
*/
Store.prototype.restoreMapConfig = function() {
  Object.keys(this._mapInitialConfig).forEach((key) => {
    const value = this._mapInitialConfig[key];
    if (value) {
      this.ctx.map[key].enable();
    } else {
      this.ctx.map[key].disable();
    }
  });
};

/**
 * Returns the initial state of an interaction setting.
 * @param {string} interaction
 * @return {boolean} `true` if the interaction is enabled, `false` if not.
 * Defaults to `true`. (Todo: include defaults.)
*/
Store.prototype.getInitialConfigValue = function(interaction) {
  if (this._mapInitialConfig[interaction] !== undefined) {
    return this._mapInitialConfig[interaction];
  } else {
    // This needs to be set to whatever the default is for that interaction
    // It seems to be true for all cases currently, so let's send back `true`.
    return true;
  }
};
